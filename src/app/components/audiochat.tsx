import { useEffect, useRef, useCallback, type MouseEventHandler } from "react";
import { RealtimeClient } from "@openai/realtime-api-beta";
import type { ItemType } from '@openai/realtime-api-beta/dist/lib/client.js';
import type { ItemContentDeltaType } from '@openai/realtime-api-beta/dist/lib/conversation';

import { WavRecorder, WavStreamPlayer } from "../lib/wavtools";

import useConfig from "../context/useConfig";
import useLog from "../context/useLog";

import { getEstimatedBusTime } from "../utils/getSttnAcctoArvlPrearngeInfoList";
import { requestOverpass } from "../utils/overpassRequest";
import { getRoute } from "../utils/graphHopperRequest";

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

  const { cityID, stationID, latitude, longitude } = useConfig();
  const { setItems } = useLog();

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
  }, []);

  const startRecording: MouseEventHandler = async (e) => {
    e.preventDefault();
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    const wavStreamPlayer = wavStreamPlayerRef.current;
    const trackSampleOffset = await wavStreamPlayer.interrupt();
    if (trackSampleOffset?.trackId) {
      const { trackId, offset } = trackSampleOffset;
      await client.cancelResponse(trackId, offset);
    }
    await wavRecorder.record((data) => client.appendInputAudio(data.mono));
  };

  /**
   * In push-to-talk mode, stop recording
   */
  const stopRecording: MouseEventHandler = async (e) => {
    e.preventDefault();
    const client = clientRef.current;
    const wavRecorder = wavRecorderRef.current;
    await wavRecorder.pause();
    client.createResponse();
  };

  useEffect(() => {
    const client = clientRef.current;

    client.updateSession({
instructions:
  '당신은 실시간 버스 도착 정보를 제공하고 사용자 문의에 응답하는 버스 안내원입니다.'
      ,
      input_audio_transcription: { model: 'whisper-1' }
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

    // 버스 도착 정보 툴
    client.addTool(
      {
        name: 'get_bus_arrival',
        description: "Get buses' arrival time left",
        parameters: {
          type: 'object',
          properties: {
            line_no: {
              type: 'string',
              description: 'Desired line number to filter the result. Returns all lines when omitted.'
            },
          },
          required: [],
        },
      }, async ({ line_no }: { line_no?: string }) => {
        console.log("Function Call: get_bus_arrival");

        const apiResponse = await getEstimatedBusTime(cityID ?? '', stationID ?? '');

        console.log(apiResponse);

        const lines = apiResponse.response.body.items.item;
        let result;
        if (line_no) {
          if (lines.map((v) => v.routeno.toString()).includes(line_no)) {
            const filtered_line = lines.filter((v) => v.routeno.toString().includes(line_no));
            result = filtered_line.map((line) => `${line.routeno} - 약 ${Math.round(line.arrtime/60)}분 후 도착`);

            console.log("Result:", result);
            return result.join('\n');
          } else {
            return "Provided line number does not pass this station.";
          }
        } else {
          result = lines.map((line) => `${line.routeno} - 약 ${Math.round(line.arrtime/60)}분 후 도착`);
        }
      }
    );

    client.addTool(
  {
      name: 'get_route',
      description: 'Get route instruction to the destination. POIs will be searched using Overpass API.',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Name of destination'
          },
          amenity: {
            type: 'string',
            enum: [
              "restaurant", 
              "cafe", 
              "atm", 
              "bank", 
              "hospital", 
              "pharmacy", 
              "school", 
              "library", 
              "parking", 
              "supermarket", 
              "police", 
              "fire_station", 
              "post_office", 
              "theatre", 
              "cinema"
            ]
          },
          tourism: {
            type: 'string',
            enum: ['hotel', 'motel', 'guest_house', 'hostel', 'camp_site', 'chalet', 'caravan_site']
          }
        }
      }
    }, async ({ name, amenity, tourism }: { name: string, amenity: string, tourism: string }) => {
      if (!(name || amenity || tourism)) {
        return "Name or amenity of POI is needed.";
      }

      const POIlist = await requestOverpass(name, amenity, tourism, 5000);
      
      console.log(POIlist);
      
      if (POIlist.length === 0) {
        return "No search result found";
      }

      const routing = await getRoute(latitude ?? 38, longitude ?? 128, POIlist[0].lat, POIlist[0].lon);

      const instructions = routing.paths[0].instructions.map((v) => `- ${v.text}`).join('\n');

      console.log(instructions);

      return `Route to ${POIlist[0].tags.name}
      ${instructions}`;
    });

    console.log(client.tools);
  }, [cityID, stationID, latitude, longitude]);

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
      const items = client.conversation.getItems();
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
      setItems(items);
    });

    setItems(client.conversation.getItems());
  }, [setItems]);

  return (
    <div >
      <button onClick={connectConversation} disabled={clientRef.current.isConnected()}>
        {clientRef.current.isConnected() ? 'Connected' : 'Connect to Audio Chat'}
      </button>
      <button onMouseDown={startRecording} onMouseUp={stopRecording}>
        Click here to speak [ PTT ]
      </button>
    </div>
  );
}

export default AudioChat;
