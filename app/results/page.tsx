import Navbar from "../components/Navbar";

const results = [
  { pos: 1, number: 18, rider: "Jett Lawrence", manufacturer: "Honda" },
  { pos: 2, number: 96, rider: "Hunter Lawrence", manufacturer: "Honda" },
  { pos: 3, number: 4, rider: "Chase Sexton", manufacturer: "KTM" },
  { pos: 4, number: 7, rider: "Aaron Plessinger", manufacturer: "KTM" },
  { pos: 5, number: 32, rider: "Justin Cooper", manufacturer: "Yamaha" },
  { pos: 6, number: 21, rider: "Jason Anderson", manufacturer: "Kawasaki" },
  { pos: 7, number: 51, rider: "Justin Barcia", manufacturer: "GasGas" },
  { pos: 8, number: 24, rider: "RJ Hampshire", manufacturer: "Husqvarna" },
  { pos: 9, number: 17, rider: "Jo Shimoda", manufacturer: "Honda" },
  { pos: 10, number: 94, rider: "Ken Roczen", manufacturer: "Suzuki" },
];

export default function ResultsPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-8">

        <Navbar />

        <section className="mt-14 text-center">

          <p className="text-sm font-black uppercase tracking-[0.35em] text-orange-500">
            Official Results
          </p>

          <h1 className="mt-3 text-6xl font-black uppercase">
            Southwick National
          </h1>

          <p className="mt-4 text-lg text-zinc-400">
            2026 Pro Motocross • Round 7 • 450MX
          </p>

        </section>

        <div className="mt-14 rounded-3xl border border-zinc-800 bg-zinc-950 overflow-hidden">

          <div className="grid grid-cols-4 bg-zinc-900 px-6 py-4 text-sm font-black uppercase tracking-widest text-zinc-400">

            <div>Pos</div>

            <div>Rider</div>

            <div>Manufacturer</div>

            <div className="text-right">Notes</div>

          </div>

          {results.map((result) => (

            <div
              key={result.pos}
              className="grid grid-cols-4 items-center border-t border-zinc-800 px-6 py-5 transition hover:bg-zinc-900"
            >

              <div className="flex items-center gap-3">

                {result.pos === 1 && "🥇"}

                {result.pos === 2 && "🥈"}

                {result.pos === 3 && "🥉"}

                {result.pos > 3 && (
                  <span className="font-black">{result.pos}</span>
                )}

              </div>

              <div>

                <p className="font-black">
                  #{result.number} {result.rider}
                </p>

              </div>

              <div className="text-zinc-400">
                {result.manufacturer}
              </div>

              <div className="text-right">

                {result.pos === 8 ? (
                  <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-black">
                    Wildcard
                  </span>
                ) : (
                  ""
                )}

              </div>

            </div>

          ))}

        </div>

      </div>
    </main>
  );
}