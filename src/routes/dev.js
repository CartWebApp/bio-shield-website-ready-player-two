fetch(`/events?path=${encodeURIComponent(location.pathname)}`)
    .then(res => res.text())
    .then(() => {
        console.log('reloading');
        location.reload();
    });
