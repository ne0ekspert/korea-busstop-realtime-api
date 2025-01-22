'use client';

import { useEffect, useState } from "react";
import { useSearchParams } from 'next/navigation'
import StationSelector from "./components/stationSelector";
import AudioChat from "./components/audiochat";
import { estimatedBusTimeItem, getEstimatedBusTime, getWeatherForecast } from "./utils/datagokrRequest";
import type { getWeatherForecastResult } from "./utils/datagokrRequest";
import useConfig from "./context/useConfig";
import useLog from "./context/useLog";
import { Sheet } from "react-modal-sheet";
import useModal from "./context/useModal";

const BusInfoUI = () => {
  const rowsPerPage = 5;
  
  const { cityID, stationID } = useConfig();
  const [ currentPage, setCurrentPage ] = useState(0);
  const [ arrivals, setArrivals ] = useState<estimatedBusTimeItem[]>([]);
  
  const totalPages = Math.ceil(arrivals.length / rowsPerPage);

  useEffect(() => {
    async function fetch() {
      if (cityID && stationID) {
        const apiResponse = await getEstimatedBusTime(cityID, stationID);
        
        let data = apiResponse.response.body.items.item;

        if (data) {
          if (!Array.isArray(data)) {
            data = [data];
          }
        }

        console.log(data);
        setArrivals(data ?? []);
      }
    }

    fetch();

    const busFetchInterval = setInterval(fetch, 30000); // 30 sec

    return () => {
      clearInterval(busFetchInterval);
    };
  }, [cityID, stationID]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [totalPages]);

  return (
    <div id='busInfoUI' className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">
        {arrivals.length > 0 ?
          arrivals[0].nodenm
          :
          '버스 정보'
        }
      </h1>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-200">
          <thead>
            <tr className="">
              <th className="border border-gray-300 px-4 py-2 text-left">노선 번호</th>
              <th className="border border-gray-300 px-4 py-2 text-left">도착 시간</th>
              <th className="border border-gray-300 px-4 py-2 text-left">버스 종류</th>
              <th className="border border-gray-300 px-4 py-2 text-left">남은 정류소</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.map((bus, index) => (
              <tr
                key={index}
              >
                <td className="border border-gray-300 px-4 py-2">{bus.routeno}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {
                    Math.round(bus.arrtime / 60) == 0 ?
                      '곧 도착'
                      :
                      `약 ${Math.round(bus.arrtime / 60)} 분`
                  }
                </td>
                <td className="border border-gray-300 px-4 py-2">{bus.vehicletp}</td>
                <td className="border border-gray-300 px-4 py-2">{bus.arrprevstationcnt}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <AudioChat />
      </div>
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          Page {currentPage + 1} of {totalPages}
        </p>
      </div>
    </div>
  );
};

const WeatherUI = () => {
  const { latitude, longitude } = useConfig();
  const [ forecast, setForecast ] = useState<getWeatherForecastResult>({});

  useEffect(() => {
    async function fetch() {
      if (latitude && longitude) {
        const apiResponse = await getWeatherForecast(latitude, longitude);

        const data = apiResponse;

        console.log(data);

        setForecast(data);
      }
    }

    fetch();

    const weatherFetchInterval = setInterval(fetch, 3600 * 1000);

    return () => {
      clearInterval(weatherFetchInterval);
    }
  }, [latitude, longitude]);

  return (
    <div className="flex flex-col w-full">
      {Object.entries(forecast).map(([dateString, value]) => {
        const year = parseInt(dateString.substring(0, 4), 10);
        const month = parseInt(dateString.substring(4, 6), 10) - 1; // 월은 0부터 시작하므로 -1
        const day = parseInt(dateString.substring(6, 8), 10);

        const date = new Date(year, month, day);

        // 로케일 날짜 문자열로 변환
        const formattedDate = date.toLocaleDateString();
        return (
          <div key={dateString} className="p-4 bg-blue-50 rounded-md shadow-md">
            <span className="block text-xl font-semibold text-gray-800">{formattedDate}</span>
            <div className="flex">
              <div className="flex mr-5 items-center">
                <span className="block text-3xl font-bold text-gray-600">{value["TMP"]}℃</span>
              </div>
              <div>
                <span className="block text-xl text-gray-600">강수확률: {value["POP"]}%</span>
                <span className="block text-xl text-gray-600">습도: {value["REH"]}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  )
};

function LogConsole() {
  const { items } = useLog();

  return (
    <div className="overflow-y-scroll h-1/2" data-conversation-content>
      {!items.length && `awaiting connection...`}
      {items.map((conversationItem) => {
        return (
          <div className="conversation-item" key={conversationItem.id}>
            <div className={`speaker ${conversationItem.role || ''}`}>
              <div>
                {(
                  conversationItem.role || conversationItem.type
                ).replaceAll('_', ' ')}
              </div>
            </div>
            <div className='speaker-content'>
              {/* tool response */}
              {conversationItem.type === 'function_call_output' && (
                <div>{conversationItem.formatted.output
                      ?.split('\\n')
                      .map((v, i) => <p key={i}>{v}</p>)}</div>
              )}
              {/* tool call */}
              {!!conversationItem.formatted.tool && (
                <div>
                  {conversationItem.formatted.tool.name}(
                  {conversationItem.formatted.tool.arguments})
                </div>
              )}
              {!conversationItem.formatted.tool &&
                conversationItem.role === 'user' && (
                  <div>
                    {conversationItem.formatted.transcript ||
                      (conversationItem.formatted.audio?.length
                        ? '(awaiting transcript)'
                        : conversationItem.formatted.text ||
                          '(item sent)')}
                  </div>
                )}
              {!conversationItem.formatted.tool &&
                conversationItem.role === 'assistant' && (
                  <div>
                    {conversationItem.formatted.transcript ||
                      conversationItem.formatted.text ||
                      '(truncated)'}
                  </div>
                )}
              {conversationItem.formatted.file && (
                <audio
                  src={conversationItem.formatted.file.url}
                  controls
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  )
}

function BottomSheet() {
  const {
    openWeather,
    openRoute,
    setOpenWeather,
    setOpenRoute
  } = useModal();

  const mountElement = document.getElementById('busInfoUI') ?? undefined;

  return (
    <div>
      <button onClick={() => setOpenWeather(true)}>날씨 열기</button>
      <Sheet
        mountPoint={mountElement}
        snapPoints={[-50, 0.5, 100, 0]}
        initialSnap={1}
        isOpen={openWeather}
        onClose={() => setOpenWeather(false)}>
        <Sheet.Container>
          <Sheet.Header />
          <Sheet.Content>
            <WeatherUI />
          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
      </Sheet>
      <Sheet
        mountPoint={mountElement}
        snapPoints={[-50, 0.5, 100, 0]}
        initialSnap={1}
        isOpen={openRoute}
        onClose={() => setOpenRoute(false)}>
        <Sheet.Container>
          <Sheet.Header />
          <Sheet.Content>

          </Sheet.Content>
        </Sheet.Container>
        <Sheet.Backdrop />
      </Sheet>
    </div>
  );
}

export default function Home() {
  const searchParams = useSearchParams();
 
  const devMode = searchParams.get('dev');

  return (
    <div className="flex h-screen overflow-hidden justify-center">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start h-full aspect-[9/16]">
        <BusInfoUI />
        <BottomSheet />
      </main>
      {devMode === '1' &&
        <aside className="h-full grow">
          <StationSelector />
          <LogConsole />
        </aside>
      }
    </div>
  );
}
