import React from "react";
import './InfoPanel.css';
import cancelIcon from './images/cancel-icon-white.png';
import backIcon from './images/right-arrow.png';

//props: alignment, closePanel, showClose, showBack, headerText, hideFooter, shouldDisplay
const InfoPanel = props => {
    const alignment = props.alignment ? props.alignment : 'center';

    function closePanel(){
        props.closePanel();
    }

    function getHeaderSection(){
        if(!props.hideHeader){
            if(props.showClose){
                return (
                    
                    <div className="info-panel-header">
                        <div className="info-header-spacer"></div>
                        <div className="info-panel-heading">{props.headerText}</div>
                        <div className="close-button-container">
                            <img className="close-button" src={cancelIcon} alt="close-button" onClick={closePanel}></img>
                        </div>
                    </div>
                )
            }else if(props.showBack){
                
                return (<div className="info-panel-header">
                <div className="close-button-container">
                    <img className="info-panel-back-button" src={backIcon} alt="back-button" onClick={closePanel}></img>
                </div>
                <div className="info-panel-heading">{props.headerText}</div>
                <div className="info-header-spacer"></div>
            </div>);
                
            }else{
                
                return (<div className="info-panel-header">
                    <div className="info-header-spacer"></div>
                    <div className="info-panel-heading">{props.headerText}</div>
                    <div className="info-header-spacer"></div>
                </div>)
            }
        }
    }

    function getFooter(){
        if(!props.hideFooter){
            return (<div class="info-panel-footer">
            <button className='nav-button' onClick={props.closePanel}>Cancel</button>
        </div>)
        }
        return (<></>)
    }

    function getContentClass(){
        let styles = 'info-panel-contents';
        if(props.noPadding){
            styles += ' no-padding';
        }
        return styles;
    }

    function getFloatingClose(){
        if(props.hideHeader && props.showClose){
            return (<div className="floating-close" onClick={props.closePanel}>
                <div className="floating-close-x">x</div>
            </div>)
        }
    }

    let panelBackgroundClass = 'info-panel-background';

    if(!props.shouldDisplay){
        panelBackgroundClass += ' hide';
    }
    if(alignment){
        panelBackgroundClass += ' ' + alignment;
    }

    if(props.shouldDisplay){
        return (
            <div className={panelBackgroundClass}> 
                <div className="info-panel"> 

                    {getHeaderSection()}
                    <div className={getContentClass()}>
                        {getFloatingClose()}
                        {props.children}
                    </div>
                    
                    {getFooter()}
                </div>
            </div>
        );
    }else{
        return (<div></div>);
    }
    
}

export default InfoPanel;
