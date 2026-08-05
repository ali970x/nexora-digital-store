export default function Loading() {
  return (
    <div className="site-container py-24" role="status" aria-label="Loading">
      <div className="ui-skeleton mx-auto h-7 w-52 rounded-full" />
      <div className="ui-skeleton mx-auto mt-8 h-24 max-w-3xl rounded-3xl" />
      <div className="ui-skeleton mx-auto mt-6 h-14 max-w-2xl rounded-2xl" />
      <div className="ui-skeleton mx-auto mt-8 h-20 max-w-3xl rounded-3xl" />
    </div>
  );
}
