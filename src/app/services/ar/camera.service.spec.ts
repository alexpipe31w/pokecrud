import { TestBed } from '@angular/core/testing';
import { CameraService, MEDIA_DEVICES } from './camera.service';

class FakeTrack {
  stopped = false;
  constructor(readonly deviceId: string) {}
  stop() {
    this.stopped = true;
  }
  getSettings() {
    return { deviceId: this.deviceId };
  }
}
const streamOf = (id: string) => {
  const track = new FakeTrack(id);
  return {
    track,
    getTracks: () => [track],
    getVideoTracks: () => [track],
  } as unknown as MediaStream & {
    track: FakeTrack;
  };
};
const DEVICES = [
  { kind: 'videoinput', label: 'camera 1, facing front', deviceId: 'cam1' },
  { kind: 'videoinput', label: 'camera 2, facing back', deviceId: 'cam2' },
  { kind: 'videoinput', label: 'camera 0, facing back', deviceId: 'cam0' },
  { kind: 'audioinput', label: 'mic', deviceId: 'mic' },
] as MediaDeviceInfo[];

describe('CameraService', () => {
  let opened: (MediaStream & { track: FakeTrack })[];
  let media: { getUserMedia: ReturnType<typeof vi.fn>; enumerateDevices: ReturnType<typeof vi.fn> };

  const setup = (m: unknown = media) => {
    TestBed.configureTestingModule({ providers: [{ provide: MEDIA_DEVICES, useValue: m }] });
    return TestBed.inject(CameraService);
  };

  beforeEach(() => {
    localStorage.clear();
    opened = [];
    media = {
      // facingMode abre el gran angular, como en el A36 (D-045)
      getUserMedia: vi.fn(async (c: MediaStreamConstraints) => {
        const v = c.video as MediaTrackConstraints;
        const s = streamOf((v.deviceId as { exact: string } | undefined)?.exact ?? 'cam2');
        opened.push(s);
        return s;
      }),
      enumerateDevices: vi.fn(async () => DEVICES),
    };
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('la primera vez cambia del gran angular a la principal y la recuerda', async () => {
    const cam = setup();
    const s = (await cam.open()) as MediaStream & { track: FakeTrack };
    expect(s.track.deviceId).toBe('cam0');
    expect(opened[0].track.stopped).toBe(true); // el gran angular se soltó
    expect(cam.state()).toBe('on');
    expect(localStorage.getItem('pokecrud.camera.v1')).toBe('cam0');
  });

  it('las siguientes veces abre directa la guardada', async () => {
    localStorage.setItem('pokecrud.camera.v1', 'cam0');
    const cam = setup();
    await cam.open();
    expect(media.getUserMedia).toHaveBeenCalledTimes(1);
    expect(media.enumerateDevices).not.toHaveBeenCalled();
  });

  it('si la guardada ya no existe, la olvida y elige otra vez', async () => {
    localStorage.setItem('pokecrud.camera.v1', 'vieja');
    media.getUserMedia.mockRejectedValueOnce(new DOMException('no', 'OverconstrainedError'));
    const cam = setup();
    const s = (await cam.open()) as MediaStream & { track: FakeTrack };
    expect(s.track.deviceId).toBe('cam0');
  });

  it('permiso denegado → denied y null', async () => {
    media.getUserMedia.mockRejectedValueOnce(new DOMException('no', 'NotAllowedError'));
    const cam = setup();
    expect(await cam.open()).toBeNull();
    expect(cam.state()).toBe('denied');
  });

  it('sin mediaDevices → unavailable', async () => {
    const cam = setup(null);
    expect(await cam.open()).toBeNull();
    expect(cam.state()).toBe('unavailable');
  });

  it('close suelta la cámara; cerrar mientras abre no deja ninguna encendida', async () => {
    localStorage.setItem('pokecrud.camera.v1', 'cam0');
    const cam = setup();
    await cam.open();
    cam.close();
    expect(opened[0].track.stopped).toBe(true);
    expect(cam.state()).toBe('off');
    const pending = cam.open();
    cam.close();
    expect(await pending).toBeNull();
    expect(opened[1].track.stopped).toBe(true);
  });
});
