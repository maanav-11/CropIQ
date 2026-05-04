import React from 'react';
import { Shield, Cpu, Zap, Globe, Github, Mail, Linkedin } from 'lucide-react';

const About = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-full text-accent text-xs font-bold uppercase tracking-widest">
          <Zap className="w-3 h-3" />
          The Future of Farming
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
          Revolutionizing <span className="text-accent">Agriculture</span> Through Intelligence
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          CropIQ leverages advanced machine learning to provide hyper-local crop yield 
          predictions and environmental analysis for sustainable agricultural growth.
        </p>
      </section>

      {/* Tech Stack / Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<Cpu className="w-6 h-6 text-accent" />}
          title="Predictive Modeling"
          description="Powered by Random Forest Regressors trained on decades of regional rainfall and production data."
        />
        <FeatureCard 
          icon={<Globe className="w-6 h-6 text-cyan-400" />}
          title="Regional Insights"
          description="Detailed cross-state analysis covering multiple crop variants across diverse climatic zones."
        />
        <FeatureCard 
          icon={<Shield className="w-6 h-6 text-rose-400" />}
          title="Data Security"
          description="Enterprise-grade architecture ensuring all agricultural telemetry remains secure and private."
        />
      </div>

      {/* Mission Section */}
      <div className="glass-card overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-accent/10 transition-colors duration-700" />
        <div className="p-8 md:p-12 relative flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1 space-y-6">
            <h2 className="text-3xl font-bold text-white">Our Core Mission</h2>
            <div className="space-y-4 text-slate-300 leading-relaxed">
              <p>
                As the global population grows, the efficiency of our food systems must evolve. 
                CropIQ was born from the intersection of environmental data science and 
                practical agronomy.
              </p>
              <p>
                We believe that by providing farmers with accessible, high-accuracy predictive 
                tools, we can reduce waste, optimize water usage, and ensure food security 
                for generations to come.
              </p>
            </div>
            <div className="flex gap-4">
              <button className="btn-primary">View Project Source</button>
              <button className="btn-secondary">Technical Docs</button>
            </div>
          </div>
          <div className="w-full md:w-1/3 grid grid-cols-2 gap-4">
             <div className="aspect-square bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4">
                <div className="text-3xl font-bold text-accent">94%</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Prediction Accuracy</div>
             </div>
             <div className="aspect-square bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4">
                <div className="text-3xl font-bold text-cyan-400">20+</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Active Regions</div>
             </div>
             <div className="aspect-square bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4">
                <div className="text-3xl font-bold text-amber-400">15+</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Crop Varieties</div>
             </div>
             <div className="aspect-square bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center p-4">
                <div className="text-3xl font-bold text-rose-400">∞</div>
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Possibilities</div>
             </div>
          </div>
        </div>
      </div>

      {/* Connect Section */}
      <footer className="text-center py-12 border-t border-slate-800 space-y-6">
        <h3 className="text-xl font-semibold text-white">Join the Agricultural Revolution</h3>
        <div className="flex justify-center gap-6">
          <a href="#" className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center border border-slate-700 hover:border-accent/50 hover:text-accent transition-all">
            <Github className="w-5 h-5" />
          </a>
          <a href="#" className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center border border-slate-700 hover:border-accent/50 hover:text-accent transition-all">
            <Linkedin className="w-5 h-5" />
          </a>
          <a href="#" className="w-12 h-12 bg-surface rounded-xl flex items-center justify-center border border-slate-700 hover:border-accent/50 hover:text-accent transition-all">
            <Mail className="w-5 h-5" />
          </a>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }) => (
  <div className="glass-card p-8 space-y-4 hover:border-accent/20 transition-colors">
    <div className="w-12 h-12 bg-slate-900/50 rounded-xl flex items-center justify-center border border-slate-800">
      {icon}
    </div>
    <h3 className="text-xl font-semibold text-white">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">
      {description}
    </p>
  </div>
);

export default About;
