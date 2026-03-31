import { Room, RoomEvent, AudioStream } from '@livekit/rtc-node';
const room = new Room();
room.on(RoomEvent.TrackSubscribed, (track: any, pub: any, participant: any) => {
  if (track.kind === 'Audio') { // Actually track.kind might be Track.Kind.Audio
     const stream = new AudioStream(track);
     // ...
  }
});
