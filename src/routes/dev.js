const source = new EventSource(
    `/events?path=${encodeURIComponent(location.pathname)}`
);
source.addEventListener('open', () => {
    source.addEventListener('close', () => {
        alert('hi');
        // location.reload();
    });
});
