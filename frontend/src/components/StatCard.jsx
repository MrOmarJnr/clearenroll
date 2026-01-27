import { TrendingUp } from "lucide-react";

export default function StatCard({ title, value, subtitle, gradient, icon }) {
  return (
    <div className="relative overflow-hidden rounded-2xl shadow-md text-white">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-white/20" />
      <div className="absolute -bottom-12 -right-6 w-36 h-36 rounded-full bg-white/10" />

      <div className="relative p-5 flex justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <h2 className="text-3xl font-bold mt-2">{value}</h2>
          <p className="text-xs mt-2 opacity-80">{subtitle}</p>
        </div>
        <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
          {icon || <TrendingUp size={20} />}
        </div>
      </div>
    </div>
  );
}
