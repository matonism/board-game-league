import React from "react";
import './Album.css';
import loadingIcon from './images/loading-icon.gif';
import cancelIcon from './images/cancel-icon.png';
import openNewTab from './images/open-new-tab-icon.png'
import driveIcon from './images/google-drive-icon-min.png'


class Album extends React.Component {

    constructor(props){
        super(props);
        
        this.albumRef = React.createRef();
        this.state = {
            largeImage: null
        };

        this.getAlbumScreen = this.getAlbumScreen.bind(this);
        this.loadingScreen = this.loadingScreen.bind(this);  
        this.hideImage = this.hideImage.bind(this);  
        this.closeLargeImageDisplay = this.closeLargeImageDisplay.bind(this);  
        this.enlargeImage = this.enlargeImage.bind(this);  
    }

    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displayAlbum(){
        // console.log(this.props.schedule);

        if(this.props.schedule && new Date().getFullYear().toString() === this.props.season){
            let albumDisplay = this.props.schedule.map((week, index) => {
                return (
                    <div key={index} className="album-container">
                        <div className="bgl-week-header">{week.week + ' - ' + week.game}</div>
                        <div className="bgl-week-subheader">{week.dates}</div>
                        <div className="bgl-week-album-container">
                            {this.getSingleWeekAlbum(week, this.props.season)}
                        </div>        
                    </div>
                )
            });

            
            return albumDisplay;
        }else if(this.props.schedule && new Date().getFullYear().toString() !== this.props.season){
            return (
                <div className="album-link-container">
                    <div className="drive-instructions">
                        For previous seasons, all game session memories can be found at the following google drive link
                    </div>
                    <a href="https://drive.google.com/drive/folders/1zOWEFt7MSUv5o3mPXpXA3UNQaOUVtExC?usp=drive_link" target="_blank" className="album-link">
                        <div className="album-link-button">
                            
                            <div className="drive-link-container">
                                <img className="drive-link" src={driveIcon}></img>
                            </div>
                            Google Drive 
                            <div className="bgg-link-container">
                                <img className="bgg-link" src={openNewTab}></img>
                            </div>
                        </div>
                    </a>
                </div>
            )
            
        }

        return (<div key="album-error">could not load album</div>);
    }

    getSingleWeekAlbum(week, season){
        return week.album.map((image, index) => {
            let imageFound = true;
            let imageURL = '';
            try{
                if(week.week.toLowerCase() === 'championship'){
                    imageURL = require("./images/" + season + '/championship.JPG');
                }else{
                    imageURL = require("./images/" + season + '/' + image + '.JPG');
                }
            }catch(error){
                imageFound = false;
            }
            if(imageFound){
                imageURL = imageURL.default ? imageURL.default : imageURL;
                return (
                    <div key={"image-"+index} className="image-container">
                        <img className="gallery-image" alt="gallery" src={imageURL} onError={this.hideImage} onClick={this.enlargeImage}/>
                    </div>
                )
            }

            return (<div key="album-error"></div>);
        })
    }

    enlargeImage(event){
        this.setState({
            largeImage: event.target.src
        })
    }

    hideImage(event){
        event.target.className = 'hidden';
    }

    getLargeImageDisplay(){
        if(this.state.largeImage !== null){
            return (<div className="large-image-background">
                <div className="large-image-container">
                    <img src={cancelIcon} alt="cancel" className="close-large-image-button" onClick={this.closeLargeImageDisplay}></img>
                    <div className="large-image-display">
                        <img className="focused-image" alt="focused-gallery" src={this.state.largeImage} onClick={this.closeLargeImageDisplay}/>
                    </div>
                </div>
            </div>)
        }
    }

    closeLargeImageDisplay(){
        this.setState({
            largeImage: null
        })
    }

    getAlbumScreen(){
        if(this.props.schedule){
            return (<>
            {this.getLargeImageDisplay()}
            <div className="container">{this.displayAlbum()}</div>
            </>)
        }else if(this.props.error){
            if(this.props.error.message){
                return (<div>{this.props.error.message}</div>)
            }
            return (<div>There was an error loading the album</div>)
        }else{
            return this.loadingScreen();
        }
    }

    render(){

    
        return (
            <>
                {this.getAlbumScreen()}
            </>
        );
    }
}

export default Album;
