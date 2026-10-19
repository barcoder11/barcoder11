export default function Loading() {
  return (
    <div className="grid gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-56 animate-pulse rounded-full bg-sage" />
      <div className="aspect-[4/5] animate-pulse rounded-[2.25rem] bg-sage sm:aspect-[16/10]" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="aspect-square animate-pulse rounded-[1.5rem] bg-sage sm:aspect-auto sm:h-28" />
        ))}
      </div>
    </div>
  );
}
