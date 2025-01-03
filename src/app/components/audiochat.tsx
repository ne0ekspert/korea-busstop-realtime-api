import { useEffect, useRef, useCallback } from "react";
import { RealtimeClient } from "@openai/realtime-api-beta";
import { WavRecorder, WavStreamPlayer } from "../lib/wavtools";

import { useConfig } from "../context/useConfig";

const AudioChat = () => {
  // Configure the refs with the options you specified
  const wavRecorderRef = useRef<WavRecorder>(
    new WavRecorder({ sampleRate: 24000 })
  );

  const wavStreamPlayerRef = useRef<WavStreamPlayer>(
    new WavStreamPlayer({ sampleRate: 24000 })
  );

  const clientRef = useRef<RealtimeClient>(
    new RealtimeClient({
      apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
      dangerouslyAllowAPIKeyInBrowser: true,
    })
  );

  const startTimeRef = useRef<string | null>(null);

  const config = useConfig();

  const connectConversation = useCallback(async () => {
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;

    if (!client || !wavRecorder || !wavStreamPlayer) {
      console.error("Initialization error: Refs not set");
      return;
    }

    startTimeRef.current = new Date().toISOString();

    // Start capturing audio from the microphone
    await wavRecorder.begin();

    // Connect the audio player for playback
    await wavStreamPlayer.connect();

    // Connect to the Realtime API via the relay
    await client.connect();

    // Send audio data directly to server with server-side voice activity detection
    await wavRecorder.record((data) => {
      client.appendInputAudio(data.mono);
    });
  }, []);

  useEffect(() => {
    const client = clientRef.current;

    client.updateSession({
      instructions:
        '당신은 버스 안내기입니다.'
      ,
      turn_detection: {
        type: 'server_vad',
        threshold: 0.7,
      },
    });
  }, []);

  // Realtime API 클라이언트 설정
  useEffect(() => {
    const client = clientRef.current;

    const existingTools = Object.keys(client.tools) || [];
    console.log(existingTools);
    existingTools.map(tool => {
      client.removeTool(tool);
    });

    // 메뉴 확인 툴
    client.addTool(
      {
        name: 'Get Bus Arrival',
        description: "Get buses' arrival time left=",
        parameters: {
          type: 'object',
          properties: {
            line_no: 'string'
          },
          required: [],
        },
      },
      async () => {
        

        return '';
      }
    );
  }, []);

  useEffect(() => {
    const client = clientRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    
    client.on('error', (event: object) => console.error(event));
    client.on('conversation.interrupted', async () => {
      const trackSampleOffset = await wavStreamPlayer.interrupt();
      if (trackSampleOffset?.trackId) {
        const { trackId, offset } = trackSampleOffset;
        client.cancelResponse(trackId, offset);
      }
    });
    client.on('conversation.updated', async ({ item, delta }: { item: ItemType, delta: ItemContentDeltaType }) => {
      if (delta?.audio) {
        wavStreamPlayer.add16BitPCM(delta.audio, item.id);
      }

      if ('status' in item && item.status === 'completed' && item.formatted.audio?.length) {
        const wavFile = await WavRecorder.decode(
          item.formatted.audio,
          24000,
          24000
        );
        item.formatted.file = wavFile;
      }
    });
  }, []);

  return (
    <div>
      <button onClick={connectConversation} disabled={clientRef.current.isConnected()}>
        {clientRef.current.isConnected() ? 'Connected' : 'Connect to Audio Chat'}
      </button>
    </div>
  );
}

export default AudioChat;