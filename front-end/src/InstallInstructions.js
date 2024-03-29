import React, { useState, useEffect } from 'react';
import "./InstallInstructions.css";
import Constants from "./Constants";
// import shareIcon from "./images/action-icon-ios.png";
import shareIcon from "./images/ios-chrome-more-button.svg";
import addToHomeScreenIcon from "./images/ios-safari-add-to-home-screen-button.svg";
import logo from "./images/bgl-logo-192.png";

//Android browser
    //Check if installed
    //if not, show prompt (if it hasn't been deferred)
//Windows desktop
    //Check if installed
    //if not, show prompt (if it hasn't been deferred)
//IOS browser
    //Check if deferred
    //otherwise, show prompt
//Standalone PWA
    //Hide prompt


function InstallInstructions() {
    const [isInstalled, setIsInstalled] = useState(false);
    const [hasBeenDeferred, setHasBeenDeferred] = useState(localStorage.getItem(Constants.LOCAL_STORAGE_INSTALL_NOTIFICATION));
    const [isInstallableAndroid, setIsInstallableAndroid] = useState(false);

    //********************************** PLATFORM CHECK FUNCTIONS ***********************************/
    function isIos() {
        const userAgent = window.navigator.userAgent.toLowerCase();
        return /iphone|ipad|ipod/.test(userAgent);
    };

    function isStandalone() {
        return ("standalone" in window.navigator && window.navigator.standalone);
    }

    function isMobile() {
        let check = false;
        // eslint-disable-next-line no-useless-escape
        (function (a) { if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true; })(navigator.userAgent || navigator.vendor || window.opera);
        return check;
    }

    
    //********************************** INSTALL PROMPT AND DISMISS FUNCTIONS ***********************************/

    useEffect(() => {
        
        if (!isInstalled && !isStandalone() && !isIos() && isMobile()) {
            
            // Could not get this to work.  It should detect if the app is already installed
            // const getRelatedApps = async () => {
            //     if(navigator && navigator.getInstalledRelatedApps){
            //         const relatedApps = await navigator.getInstalledRelatedApps();
            //         console.log(relatedApps);
            //     }
            // }

            // getRelatedApps();

            //When the prompt would normally appear to install, we catch that event
            window.addEventListener("beforeinstallprompt", (event) => {
                event.preventDefault();
                window.installPrompt = event;
                setIsInstallableAndroid(true);
            });

            //When the app would be installed, we 
            window.addEventListener("appinstalled", () => {
                setIsInstalled(true);
                setIsInstallableAndroid(false);
                window.installPrompt = null;
                console.log("Thank you for installing our app!");
            });
              
        }

    }, [isInstalled]);

    async function installAppAndroid(){
        if (!window.installPrompt) {
            return;
        }
        const result = await window.installPrompt.prompt();        
        console.log(`Install prompt was: ${result.outcome}`);
        if(result.outcome === 'accepted'){
            setIsInstalled(true);
        }
    }

    function onCloseClick() {
        if (localStorage.getItem(Constants.LOCAL_STORAGE_INSTALL_NOTIFICATION) === null) {
            localStorage.setItem(Constants.LOCAL_STORAGE_INSTALL_NOTIFICATION, "true");
        }
        setHasBeenDeferred(true);
    }


    //********************************** UI FUNCTIONS ***********************************/
    function getPlatformSpecificPrompt() {
        if (isMobile()) {
            if (isIos()) {
                return (

                    <div className='install-modal-content'>
                        <div className='install-logo-container'>
                            <img className="install-logo" src={logo} alt="logo"></img>
                        </div>
                        <div className='install-modal-close-button' onClick={onCloseClick}>x</div>
                        <div className='instruction-list-header'>Try out the Board Game League mobile app</div>
                        <div className='instruction-list-item'>
                            <div className='list-number'>1</div>
                            <div>
                            Tap the <img src={shareIcon} alt="share icon" className='share-icon'></img> button below
                            </div>
                        </div>
                        <div className='instruction-list-item'>
                            <div className='list-number'>2</div>
                            <div>
                                Tap the <img src={addToHomeScreenIcon} alt="add to homescreen icon" className='share-icon'></img> option from the list that appears
                            </div>
                        </div>

                    </div>
                )
            } else if(isInstallableAndroid) {
                return (
                    <div className='install-modal-content'>
                        <div className='install-logo-container'>
                            <img className="install-logo" src={logo} alt="logo"></img>
                        </div>
                        <div className='install-modal-close-button' onClick={onCloseClick}>x</div>
                        <div className='instruction-list-header'>Try out the Board Game League mobile app</div>
                        <div className='install-button-container'>
                            <button onClick={installAppAndroid}>
                                Install App
                            </button>
                        </div>
                    </div>

                )
            }
        } else {
            return null;
        }
    }

    function displayPrompt() {
        if (!isInstalled && !isStandalone() && !hasBeenDeferred) {
            return getPlatformSpecificPrompt();
        }
    }

    let markup = displayPrompt();
    if (markup) {
        return (
            <div>
                <div className="pwa-install-prompt">
                    {markup}
                </div>
                <div className='large-image-background'></div>
            </div>
        )
    } else {
        return (<></>)
    }
}

export default InstallInstructions;