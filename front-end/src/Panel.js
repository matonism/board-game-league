import React from "react";
import './Panel.css';
import Constants from "utilities/js/Constants";

const cancelIcon = Constants.ICON_CANCEL;


class Panel extends React.Component {

    constructor(props){
        super(props);
        this.state = { 
            showClose: this.props.showClose,
            hideFooter: this.props.hideFooter,
            noPadding: this.props.noPadding
        };
        this.closePanel = this.closePanel.bind(this);

        this.contentRef = React.createRef();
    }

    closePanel(event){
        this.props.closePanel(event);
    }

    get headerSection(){
        if(this.state.showClose){
            return (
                
                <div className="popup-panel-header">
                    <div className="popup-header-spacer"></div>
                    <div className="popup-panel-heading">{this.props.headerText}</div>
                    <div className="close-button-container"><img className="close-button" src={cancelIcon} alt="close-button" onClick={this.closePanel}></img></div>
                </div>
            )
        }else{
            
            return (<div className="popup-panel-header">
                <div className="popup-header-spacer"></div>
                <div className="popup-panel-heading">{this.props.headerText}</div>
                <div className="popup-header-spacer"></div>
            </div>)
        }
    }

    get footer(){
        if(!this.state.hideFooter){
            return (<div class="panel-footer">
            <button className='nav-button' onClick={this.props.closePanel}>Cancel</button>
        </div>)
        }
        return (<></>)
    }

    get contentClass(){
        let styles = 'side-panel-contents';
        if(this.noPadding){
            styles += ' no-padding';
        }
    }

    render(){
        let panelBackgroundClass = 'Panel settings-panel';

        if(!this.props.shouldDisplay){
            panelBackgroundClass += ' hide';
        }

        if(this.props.shouldDisplay){
            return (
                <div className={panelBackgroundClass}> 
                    <div className="side-panel"> 
    
                        {this.headerSection}
                        <div className={this.contentClass} ref={this.contentRef}>
                            {this.props.children}
                        </div>
                        
                        {this.footer}
                    </div>
                </div>
            );
        }else{
            return (<div></div>);
        }
    }
}

export default Panel;
