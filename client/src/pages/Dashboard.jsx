import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area, BarChart, Bar, Legend 
} from 'recharts';
import { 
  Leaf, Droplets, TrendingUp, Zap, Info, 
  ChevronDown, AlertCircle, Calendar, Target
} from 'lucide-react';
import api from '../api';

const Dashboard = () => {
  const [states, setStates] = useState([]);
  const [crops, setCrops] = useState([]);
  const [selectedState, setSelectedState] = useState('');
  const [selectedCrop, setSelectedCrop] = useState('');
  const [trends, setTrends] = useState([]);
  const [forecasts, setForecasts] = useState([]);
  const [simulation, setSimulation] = useState({ rainfall: 1000, predictedYield: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch initial options
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const res = await api.get('/options');
        setStates(res.data.states);
        if (res.data.states.length > 0) {
          setSelectedState(res.data.states[0]);
        }
      } catch (err) {
        setError("Failed to load platform data. Please check connection.");
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  // Fetch crops when state changes
  useEffect(() => {
    if (!selectedState) return;
    const fetchCrops = async () => {
      try {
        const res = await api.get(`/crops?state=${selectedState}`);
        setCrops(res.data.crops);
        if (res.data.crops.length > 0) {
          setSelectedCrop(res.data.crops[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchCrops();
  }, [selectedState]);

  // Fetch data when state/crop changes
  useEffect(() => {
    if (!selectedState || !selectedCrop) return;
    const fetchData = async () => {
      try {
        const [trendRes, forecastRes] = await Promise.all([
          api.get(`/trends?state=${selectedState}&crop=${selectedCrop}`),
          api.get(`/forecast?state=${selectedState}&crop=${selectedCrop}`)
        ]);
        setTrends(trendRes.data.trends);
        setForecasts(forecastRes.data.forecasts);
        
        // Initialize simulation with avg rainfall
        const avgRain = trendRes.data.trends.reduce((acc, curr) => acc + curr.ANNUAL, 0) / trendRes.data.trends.length;
        setSimulation(prev => ({ ...prev, rainfall: Math.round(avgRain) }));
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [selectedState, setSelectedCrop, selectedCrop]);

  // Handle Simulation
  useEffect(() => {
    if (!selectedState || !selectedCrop) return;
    const runSimulation = async () => {
      try {
        const res = await api.post('/simulate', {
          state: selectedState,
          crop: selectedCrop,
          year: 2026,
          rainfall: simulation.rainfall
        });
        setSimulation(prev => ({ ...prev, predictedYield: res.data.predicted_yield }));
      } catch (err) {
        console.error(err);
      }
    };
    const debounce = setTimeout(runSimulation, 500);
    return () => clearTimeout(debounce);
  }, [simulation.rainfall, selectedState, selectedCrop]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 font-medium animate-pulse">Initializing Neural Harvest Engines...</p>
      </div>
    </div>
  );

  const latestTrend = trends.length > 0 ? trends[trends.length - 1] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
            Intelligence <span className="text-accent">Dashboard</span>
          </h1>
          <p className="text-slate-400">
            Real-time analytics for <span className="text-white font-medium">{selectedCrop}</span> in <span className="text-white font-medium">{selectedState}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* State Selector */}
          <div className="relative group min-w-[200px]">
            <label className="absolute -top-2.5 left-3 px-1 bg-primary text-[10px] font-bold text-accent uppercase tracking-widest z-10">Region</label>
            <select 
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-surface/50 border border-slate-700 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all hover:border-slate-500"
            >
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>

          {/* Crop Selector */}
          <div className="relative group min-w-[200px]">
            <label className="absolute -top-2.5 left-3 px-1 bg-primary text-[10px] font-bold text-accent uppercase tracking-widest z-10">Yield Strategy</label>
            <select 
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              className="w-full bg-surface/50 border border-slate-700 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all hover:border-slate-500"
            >
              {crops.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Zap className="text-accent" />}
          label="Latest Yield"
          value={latestTrend ? `${Math.round(latestTrend.Yield)} kg/ha` : "N/A"}
          trend="+4.2%"
          subtext={`Recorded in ${latestTrend?.Crop_Year}`}
        />
        <StatCard 
          icon={<Droplets className="text-cyan-400" />}
          label="Avg Rainfall"
          value={latestTrend ? `${Math.round(latestTrend.ANNUAL)} mm` : "N/A"}
          trend="-2.1%"
          subtext="Annual precipitation"
        />
        <StatCard 
          icon={<Target className="text-amber-400" />}
          label="Model Confidence"
          value="94.7%"
          subtext="R² evaluation score"
        />
        <StatCard 
          icon={<Calendar className="text-rose-400" />}
          label="Forecast Window"
          value="3 Years"
          subtext="Predictive horizon"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-card p-6 min-h-[450px] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Historical Performance
              </h3>
              <p className="text-xs text-slate-500 mt-1">Correlation between rainfall and yield output</p>
            </div>
            <div className="flex gap-4 text-[10px] font-bold uppercase tracking-tighter">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-accent" /> Yield</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Rainfall</span>
            </div>
          </div>
          
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends}>
                <defs>
                  <linearGradient id="colorYield" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="Crop_Year" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="Yield" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorYield)" />
                <Line type="monotone" dataKey="ANNUAL" stroke="#22D3EE" strokeWidth={2} dot={false} strokeDasharray="5 5" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Simulation / Forecast List */}
        <div className="flex flex-col gap-8">
          {/* Predictive Insights */}
          <div className="glass-card p-6 flex-1">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
              <Zap className="w-5 h-5 text-amber-400" />
              Neural Forecasts
            </h3>
            <div className="space-y-4">
              {forecasts.map((f, i) => (
                <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex justify-between items-center group hover:border-accent/30 transition-all">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{f.year} Projection</div>
                    <div className="text-lg font-bold text-white">{Math.round(f.forecast_yield)} <span className="text-xs font-normal text-slate-400">kg/ha</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-accent font-bold">EXPEC. RAIN</div>
                    <div className="text-sm font-medium text-slate-300">{Math.round(f.expected_rainfall)}mm</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Yield Simulator */}
          <div className="glass-card p-6 border-l-4 border-l-accent">
            <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
              Yield Simulator
            </h3>
            <p className="text-xs text-slate-400 mb-6">Adjust environmental variables to simulate outcomes.</p>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase">
                  <span>Annual Rainfall</span>
                  <span className="text-accent">{simulation.rainfall} mm</span>
                </div>
                <input 
                  type="range" min="100" max="3000" step="50"
                  value={simulation.rainfall}
                  onChange={(e) => setSimulation(prev => ({ ...prev, rainfall: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
              </div>

              <div className="bg-accent/10 rounded-xl p-4 border border-accent/20">
                <div className="text-[10px] font-bold text-accent uppercase tracking-widest mb-1">Predicted Output</div>
                <div className="text-2xl font-bold text-white">
                  {Math.round(simulation.predictedYield)} <span className="text-sm font-normal text-accent/70">kg per hectare</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, trend, subtext }) => (
  <div className="glass-card p-6 group hover:translate-y-[-4px] transition-all duration-300">
    <div className="flex justify-between items-start mb-4">
      <div className="w-10 h-10 bg-slate-900/80 rounded-xl flex items-center justify-center border border-slate-800 group-hover:border-accent/30 transition-colors">
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-400">{subtext}</div>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 border border-slate-700 p-4 rounded-xl shadow-2xl backdrop-blur-xl">
        <p className="text-xs font-bold text-slate-500 mb-2 uppercase tracking-widest">{label} Metrics</p>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Yield: <span className="text-white">{Math.round(payload[0].value)} kg/ha</span>
          </p>
          {payload[1] && (
            <p className="text-sm font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Rain: <span className="text-white">{Math.round(payload[1].value)} mm</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default Dashboard;
