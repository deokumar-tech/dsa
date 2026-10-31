import { useMemo, useState } from 'react';

const yearOptions = [2022, 2023, 2024, 2025];
const makes = ['Toyota', 'Honda', 'Ford', 'BMW', 'Tesla'];
const models = {
  Toyota: ['RAV4 Hybrid', 'Camry', 'Corolla'],
  Honda: ['CR-V', 'Accord', 'Civic'],
  Ford: ['F-150', 'Mustang', 'Explorer'],
  BMW: ['3 Series', 'X5', 'i4'],
  Tesla: ['Model 3', 'Model Y', 'Cybertruck'],
};

export default function VehicleSelector({ onSearch }) {
  const [year, setYear] = useState(yearOptions[0]);
  const [make, setMake] = useState(makes[0]);
  const [model, setModel] = useState(models[makes[0]][0]);
  const [zipCode, setZipCode] = useState('94105');

  const availableModels = useMemo(() => models[make] || [], [make]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch?.({ year, make, model, zipCode });
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl shadow-slate-950/20">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-cyan-300">Vehicle target</p>
          <h3 className="mt-2 text-2xl font-bold text-white">Find local deal flow</h3>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-emerald-300">
          Live inventory
        </span>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <label className="space-y-2">
          <span className="text-sm text-slate-300">Year</span>
          <select
            value={year}
            onChange={(event) => setYear(Number(event.target.value))}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none ring-0 transition focus:border-cyan-400"
          >
            {yearOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Make</span>
          <select
            value={make}
            onChange={(event) => {
              const nextMake = event.target.value;
              setMake(nextMake);
              setModel(models[nextMake][0]);
            }}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
          >
            {makes.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Model</span>
          <select
            value={model}
            onChange={(event) => setModel(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
          >
            {availableModels.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-sm text-slate-300">Zip code</span>
          <input
            value={zipCode}
            onChange={(event) => setZipCode(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-3 text-white outline-none transition focus:border-cyan-400"
            placeholder="94105"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-3 font-semibold text-white shadow-lg shadow-cyan-500/30 transition hover:opacity-95"
          >
            Search deals
          </button>
        </div>
      </form>
    </div>
  );
}
