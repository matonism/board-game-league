export function setActiveTabClass(tabRefs, name){
    tabRefs.forEach((tab) => {
        if(tab.className.includes(' active')){
            tab.className = tab.className.replace(' active', '');
        }
  
        if(tab.dataset.name === name){
            tab.className += ' active';
        }
    })
}