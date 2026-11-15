export function X() {
  return (
    <>
      <span className="rotate-45">a</span>
      <svg viewBox="0 0 8 8" />
      <CheckIcon className="transition-[scale] scale-90" />
      {/* lint-allow pixel: decorative */}
      <span className="rotate-[10deg]">b</span>
    </>
  );
}
const CheckIcon = ({ className }: { className?: string }) => <i className={className} />;
