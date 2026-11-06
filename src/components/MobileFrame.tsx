import React, { useState, useEffect } from "react";
import { Wifi, Battery, Plane } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface MobileFrameProps {
  children: React.ReactNode;
}

export const MobileFrame: React.FC<MobileFrameProps> = ({ children }) => {
  const { isAirplaneMode, setAirplaneMode } = useAuth();
  const [timeStr, setTimeStr] = useState("09:41");

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[390px] h-[720px] bg-slate-950 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50 flex flex-col justify-between overflow-hidden select-none">
      {/* Top Speaker & Camera Dynamic Island */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-28 h-5 bg-black rounded-full z-40 flex items-center justify-end px-3">
        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800"></div>
      </div>

      {/* Mobile OS Status Bar */}
      <div className="relative z-30 pt-2 px-6 flex items-center justify-between text-xs text-slate-300 font-medium">
        <span className="font-semibold tracking-tight">{timeStr}</span>
        <div className="flex items-center gap-2">
          {isAirplaneMode ? (
            <span className="flex items-center gap-1 text-[10px] text-amber-400 font-bold bg-amber-500/20 px-1.5 py-0.5 rounded-md">
              <Plane className="w-3 h-3" />
              <span>Avión</span>
            </span>
          ) : (
            <Wifi className="w-3.5 h-3.5 text-slate-300" />
          )}
          <Battery className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      {/* Screen Body Viewport */}
      <div className="relative flex-1 w-full mt-2 rounded-[32px] overflow-hidden bg-slate-950 flex flex-col">
        {children}
      </div>

      {/* Bottom Home Indicator */}
      <div className="pt-2 pb-1 flex justify-center items-center">
        <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
      </div>
    </div>
  );
};
