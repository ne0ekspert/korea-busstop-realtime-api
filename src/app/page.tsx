'use client';

import { useEffect, useState } from "react";
import StationSelector from "./components/stationSelector";
import AudioChat from "./components/audiochat";
import { estimatedBusTimeItem, getEstimatedBusTime } from "./utils/getSttnAcctoArvlPrearngeInfoList";
import useConfig from "./context/useConfig";

const BusInfoUI = () => {
  const rowsPerPage = 5;
  
  const { cityID, stationID } = useConfig();
  const [ currentPage, setCurrentPage ] = useState(0);
  const [ arrivals, setArrivals ] = useState<estimatedBusTimeItem[]>([]);
  
  const totalPages = Math.ceil(arrivals.length / rowsPerPage);

  useEffect(() => {
    if (cityID && stationID) {
      (async () => {
        const apiResponse = await getEstimatedBusTime(cityID, stationID);
        
        let data = apiResponse.response.body.items.item;

        if (data) {
          if (!Array.isArray(data)) {
            data = [data];
          }
        }

        console.log(data);
        setArrivals(data ?? []);
      })();
    }
  }, [cityID, stationID]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, 5000);

    return () => clearInterval(interval); // Cleanup interval on unmount
  }, [totalPages]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold text-center mb-6">Bus Information</h1>
      <div className="overflow-x-auto">
        <table className="table-auto w-full border-collapse border border-gray-200">
          <thead>
            <tr className="">
              <th className="border border-gray-300 px-4 py-2 text-left">Route No</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Station Name</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Arriving In</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Vehicle Type</th>
              <th className="border border-gray-300 px-4 py-2 text-left">Stations Left</th>
            </tr>
          </thead>
          <tbody>
            {arrivals.map((bus, index) => (
              <tr
                key={index}
              >
                <td className="border border-gray-300 px-4 py-2">{bus.routeno}</td>
                <td className="border border-gray-300 px-4 py-2">{bus.nodenm}</td>
                <td className="border border-gray-300 px-4 py-2">
                  {`Approx. ${Math.round(bus.arrtime / 60)} min`}
                </td>
                <td className="border border-gray-300 px-4 py-2">{bus.vehicletp}</td>
                <td className="border border-gray-300 px-4 py-2">{bus.arrprevstationcnt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4 text-center">
        <p className="text-gray-600">
          Page {currentPage + 1} of {totalPages}
        </p>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <div className="flex h-screen">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start h-full aspect-[9/16]">
        <BusInfoUI />
      </main>
      <aside className="h-full grow">
        <StationSelector />
      </aside>
    </div>
  );
}
