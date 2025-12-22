export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF9F6]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-3 border-[#E5E4E0] border-t-[#26A69A] rounded-full animate-spin" />
        <p className="text-sm text-[#999999] tracking-wider">Loading...</p>
      </div>
    </div>
  );
}
