'use server';

import axios from 'axios';

interface GraphHopperResponse {
  paths: Array<{
    distance: number;
    time: number;
    points: {
      coordinates: number[][];
    };
    instructions: Array<{
      text: string;
      distance: number;
      time: number;
    }>;
  }>;
}

export async function getRoute(startLat: number, startLong: number, endLat: number, endLong: number): Promise<GraphHopperResponse> {
  const apiKey = process.env.GRAPHHOPPER_API_KEY;
  if (!apiKey) {
    throw new Error('GraphHopper API key is not set');
  }

  const response = await axios.post('https://graphhopper.com/api/1/route',
  {
      points: [
        [startLong, startLat],
        [endLong, endLat]
      ],
      profile: 'foot',
      locale: 'ko',
      instructions: true,
    },
    {
      params: {
        key: apiKey
      }
    }
  );

  return response.data;
}
