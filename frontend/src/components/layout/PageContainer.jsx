export default function PageContainer({ children, className = "" }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-3 py-4 sm:px-4 lg:px-6 lg:py-6 ${className}`}>
      {children}
    </div>
  );
}