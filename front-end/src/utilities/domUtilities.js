//TODO: See why in PWA, we can still scroll on the body, even when it should be frozen
//TODO: Also see if we can disable the scroll to refresh when dialog box is open
export function freezeBody(){
    let body = document.querySelector('body');
    body.classList.add('noscroll');
    let html = document.querySelector('html');
    html.classList.add('noscroll');
}
export function unfreezeBody(){
    let body = document.querySelector('body');
    body.classList.remove('noscroll');
    let html = document.querySelector('html');
    html.classList.remove('noscroll');
}