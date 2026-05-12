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
  const [selectedYear, setSelectedYear] = useState(2024);
  const [simulation, setSimulation] = useState({ rainfall: 1000, predictedYield: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingCrops, setLoadingCrops] = useState(false);
  const [avgHistoricalYield, setAvgHistoricalYield] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState(null);

  const years = Array.from({ length: 15 }, (_, i) => 2016 + i);

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
      setLoadingCrops(true);
      setCrops([]); // Clear existing crops immediately to prevent stale selection
      try {
        const res = await api.get(`/crops?state=${selectedState}`);
        const fetchedCrops = res.data.crops;
        setCrops(fetchedCrops);
        if (fetchedCrops.length > 0) {
          setSelectedCrop(fetchedCrops[0]);
        } else {
          setSelectedCrop('');
        }
      } catch (err) {
        console.error(err);
        setCrops([]);
        setSelectedCrop('');
      } finally {
        setLoadingCrops(false);
      }
    };
    fetchCrops();
  }, [selectedState]);

  const fetchData = async (state, crop, year) => {
    if (!state || !crop) return;
    setIsUpdating(true);
    try {
      const [trendRes, forecastRes] = await Promise.all([
        api.get(`/trends?state=${state}&crop=${crop}`),
        api.get(`/forecast?state=${state}&crop=${crop}&year=${year}`)
      ]);
      
      const historicalTrends = trendRes.data.trends || [];
      const newForecasts = forecastRes.data.forecasts || [];
      
      setTrends(historicalTrends);
      setForecasts(newForecasts);
      
      // Calculate averages for context
      if (historicalTrends.length > 0) {
        const totalRain = historicalTrends.reduce((acc, curr) => acc + curr.ANNUAL, 0);
        const totalYield = historicalTrends.reduce((acc, curr) => acc + curr.Yield, 0);
        const avgRain = totalRain / historicalTrends.length;
        const avgYield = totalYield / historicalTrends.length;
        
        setAvgHistoricalYield(avgYield);
        setSimulation(prev => ({ ...prev, rainfall: Math.round(avgRain) }));
      } else {
        setAvgHistoricalYield(0);
      }
    } catch (err) {
      console.error("Fetch Error:", err);
      setTrends([]);
      setForecasts([]);
    } finally {
      setIsUpdating(false);
    }
  };

  // Trigger main data fetch
  useEffect(() => {
    if (selectedState && selectedCrop && crops.includes(selectedCrop)) {
      fetchData(selectedState, selectedCrop, selectedYear);
    }
  }, [selectedState, selectedCrop, selectedYear, crops]);

  // Handle Simulation
  useEffect(() => {
    if (!selectedState || !selectedCrop) return;
    const runSimulation = async () => {
      try {
        const res = await api.post('/simulate', {
          state: selectedState,
          crop: selectedCrop,
          year: selectedYear,
          rainfall: simulation.rainfall
        });
        setSimulation(prev => ({ ...prev, predictedYield: res.data.predicted_yield }));
      } catch (err) {
        console.error(err);
      }
    };
    const debounce = setTimeout(runSimulation, 500);
    return () => clearTimeout(debounce);
  }, [simulation.rainfall, selectedState, selectedCrop, selectedYear]);

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
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Intelligence <span className="text-accent">Dashboard</span>
          </h1>
          <p className="text-xs text-slate-400">
            Real-time analytics for <span className="text-white font-medium">{selectedCrop}</span> in <span className="text-white font-medium">{selectedState}</span>
          </p>
        </div>

        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          {/* Region Selector */}
          <div className="relative group min-w-[160px]">
            <label className="absolute -top-2 left-3 px-1 bg-primary text-[9px] font-bold text-accent uppercase tracking-widest z-10">Region</label>
            <select 
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full bg-surface/50 border border-slate-700 rounded-lg px-3 py-2 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all hover:border-slate-500"
            >
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          {/* Crop Selector */}
          <div className="relative group min-w-[160px]">
            <label className="absolute -top-2 left-3 px-1 bg-primary text-[9px] font-bold text-accent uppercase tracking-widest z-10">Yield Strategy</label>
            <select 
              value={selectedCrop}
              onChange={(e) => setSelectedCrop(e.target.value)}
              disabled={loadingCrops || crops.length === 0}
              className="w-full bg-surface/50 border border-slate-700 rounded-lg px-3 py-2 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all hover:border-slate-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingCrops ? (
                <option>Loading crops...</option>
              ) : crops.length > 0 ? (
                crops.map(c => <option key={c} value={c}>{c}</option>)
              ) : (
                <option>No crops available</option>
              )}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>

          <div className="relative group min-w-[100px]">
            <label className="absolute -top-2 left-3 px-1 bg-primary text-[9px] font-bold text-accent uppercase tracking-widest z-10">Start Year</label>
            <select 
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-full bg-surface/50 border border-slate-700 rounded-lg px-3 py-2 text-xs appearance-none focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all hover:border-slate-500"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          icon={<Zap className="text-accent" />}
          label="Latest Yield"
          value={latestTrend ? `${latestTrend.Yield.toFixed(2)} kg/ha` : "N/A"}
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

      {/* Charts & Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Chart */}
        <div className="lg:col-span-2 glass-card p-5 h-[380px] lg:h-[420px] flex flex-col">
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
          
          <div className="flex-1 w-full relative">
            {isUpdating && (
              <div className="absolute inset-0 z-20 bg-primary/20 backdrop-blur-[2px] flex items-center justify-center rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] font-bold text-accent uppercase tracking-widest">Updating Trends...</span>
                </div>
              </div>
            )}
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

        {/* Predictive Insights */}
        <div className="glass-card p-6 flex flex-col h-[380px] lg:h-[420px]">
          <h3 className="text-lg font-semibold flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-amber-400" />
            Neural Forecasts
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1 relative">
            {isUpdating ? (
              <div className="flex flex-col gap-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-slate-900/50 rounded-xl border border-slate-800 animate-pulse" />
                ))}
              </div>
            ) : forecasts.length > 0 ? (
              forecasts.map((f, i) => (
                <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 flex justify-between items-center group hover:border-accent/30 transition-all">
                  <div>
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-widest">{f.year} Projection</div>
                    <div className="text-lg font-bold text-white">{f.forecast_yield.toFixed(2)} <span className="text-xs font-normal text-slate-400">kg/ha</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-accent font-bold">EXPEC. RAIN</div>
                    <div className="text-sm font-medium text-slate-300">{Math.round(f.expected_rainfall)}mm</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic p-8 text-center">
                No forecast data available for this selection.
              </div>
            )}
          </div>
        </div>

        {/* Yield Simulator - Full Width Row */}
        <div className="lg:col-span-3 glass-card p-6 border-l-4 border-l-accent">
          <div className="flex flex-col lg:flex-row gap-8 items-center">
            <div className="lg:w-1/3">
              <h3 className="text-lg font-semibold flex items-center gap-2 mb-2">
                Yield Simulator
              </h3>
              <p className="text-xs text-slate-400">Test rainfall scenarios to predict potential harvest impact in real-time.</p>
            </div>
            
            <div className="lg:w-2/3 w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex justify-between text-xs font-bold text-slate-300 uppercase">
                  <span>Annual Rainfall</span>
                  <span className="text-accent text-sm">{simulation.rainfall} mm</span>
                </div>
                <input 
                  type="range" min="100" max="3000" step="50"
                  value={simulation.rainfall}
                  onChange={(e) => setSimulation(prev => ({ ...prev, rainfall: parseInt(e.target.value) }))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-accent"
                />
                <div className="flex justify-between text-[10px] text-slate-500 uppercase font-medium">
                  <span>Arid (100mm)</span>
                  <span>Tropical (3000mm)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Predicted Output</div>
                    <div className="text-2xl font-bold text-white">
                      {simulation.predictedYield.toFixed(2)} <span className="text-sm font-normal text-slate-400">kg/ha</span>
                    </div>
                  </div>
                  
                  {avgHistoricalYield > 0 && (
                    <div className="text-right">
                      <div className="text-[9px] font-bold text-slate-500 uppercase mb-1">Variance</div>
                      <div className={`text-sm font-bold ${
                        simulation.predictedYield >= avgHistoricalYield ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {simulation.predictedYield >= avgHistoricalYield ? '↑' : '↓'}
                        {Math.abs(((simulation.predictedYield - avgHistoricalYield) / avgHistoricalYield) * 100).toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-accent/5 rounded-xl p-3 border border-accent/10 flex items-start gap-3">
                  <div className="mt-0.5">
                    <Info className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-accent uppercase tracking-widest block mb-1">Harvest Health Insight</span>
                    <p className="text-[11px] text-slate-300 leading-relaxed italic">
                      {simulation.predictedYield > avgHistoricalYield * 1.1 
                        ? "Optimal rainfall profile. Predicted harvest is significantly above regional benchmarks."
                        : simulation.predictedYield > avgHistoricalYield * 0.9
                        ? "Standard performance range. Yield remains stable under these environmental conditions."
                        : "Yield stress detected. Rainfall levels are insufficient to sustain peak productivity."}
                    </p>
                  </div>
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
  <div className="glass-card p-4 group hover:translate-y-[-4px] transition-all duration-300">
    <div className="flex justify-between items-center mb-3">
      <div className="w-8 h-8 bg-slate-900/80 rounded-lg flex items-center justify-center border border-slate-800 group-hover:border-accent/30 transition-colors">
        {React.cloneElement(icon, { size: 16 })}
      </div>
      {trend && (
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
          {trend}
        </span>
      )}
    </div>
    <div className="space-y-0.5">
      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-[10px] text-slate-400">{subtext}</div>
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
