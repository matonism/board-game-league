//TODO: Figure out why my PWA just started refreshing each time I change the S3 bucket contents
//Previously, when I would change the S3 bucket contents, I could close out of the BGL "add to home screen" app and reopen, but no updates would appear
//I tried adding a service worker here and registering it, and then it started working automatically refreshing with new updates when we reopen the app
//So I tried removing the references to the service worker completely, deleting the PWA from my phone and reinstalled, but everything was still
//refreshing as desired. 
//I am not sure if the presence of a service worker at one point in time caused this, but it seemed like my phone just stopped caching

if('serviceWorker' in navigator && false){
    navigator.serviceWorker.register('/sw.js', { scope: '/'}).then((registration) => {
        //registration.addEventListener("updatefound", () => {
        //    window.location.reload();
        //})

        // registration.addEventListener('updatefound', () => {
        //     // An updated service worker has appeared in registration.installing!
        //     newWorker = registration.installing;
    
        //     newWorker.addEventListener('statechange', () => {
    
        //         // Has service worker state changed?
        //         if(newWorker.state == 'installed'){
        //             console.log('new service worker is running now')
        //             // There is a new service worker available, show the notification
        //             if (navigator.serviceWorker.controller) {
        //                 //window.location.reload();
        //                 //let notification = document.getElementById('notification ');
        //                 //notification.className = 'show';
        //             }
                    
        //         }

        //     });
        // });

        // console.log('Service Worker Registered');
    })

    navigator.serviceWorker.ready.then((registration) => {
        // console.log('Service Worker Ready')
    })
}