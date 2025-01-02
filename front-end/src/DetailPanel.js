import React from "react";
import './DetailPanel.css';
import cancelIcon from './utilities/images/cancel-icon.png';
import backIcon from './utilities/images/right-arrow.png';

const DetailPanel = props => {
    const alignment = props.alignment ? props.alignment : 'center';

    function closePanel(){
        props.closePanel();
    }

    function getHeaderSection(){
        if(props.showClose){
            return (
                
                <div className="detail-panel-header">
                    <div className="detail-header-spacer"></div>
                    <div className="detail-panel-heading">{props.headerText}</div>
                    <div className="close-button-container">
                        <img className="close-button" src={cancelIcon} alt="close-button" onClick={closePanel}></img>
                    </div>
                </div>
            )
        }else if(props.showBack){
            
            return (<div className="detail-panel-header">
            <div className="close-button-container">
                <img className="detail-panel-back-button" src={backIcon} alt="back-button" onClick={closePanel}></img>
            </div>
            <div className="detail-panel-heading">{props.headerText}</div>
            <div className="detail-header-spacer"></div>
        </div>);
            
        }else{
            
            return (<div className="detail-panel-header">
                <div className="detail-header-spacer"></div>
                <div className="detail-panel-heading">{props.headerText}</div>
                <div className="detail-header-spacer"></div>
            </div>)
        }
    }

    function getFooter(){
        if(!props.hideFooter){
            return (<div class="detail-panel-footer">
            <button className='nav-button' onClick={props.closePanel}>Cancel</button>
        </div>)
        }
        return (<></>)
    }

    function getContentClass(){
        let styles = 'detail-panel-contents';
        if(props.noPadding){
            styles += ' no-padding';
        }
    }

    let panelBackgroundClass = 'detail-panel-background';

    if(!props.shouldDisplay){
        panelBackgroundClass += ' hide';
    }
    if(alignment){
        panelBackgroundClass += ' ' + alignment;
    }

    if(props.shouldDisplay){
        return (
            <div className={panelBackgroundClass}> 
                <div className="detail-panel"> 

                    {getHeaderSection()}
                    <div className={getContentClass()}>
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

export default DetailPanel;
