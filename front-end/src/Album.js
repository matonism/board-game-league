import React from "react";
import './Album.css';
import loadingIcon from './images/loading-icon.gif';
import cancelIcon from './images/cancel-icon.png';


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

    componentDidMount(){
        
    }

    loadingScreen(){
        return (<div className="loading-icon-container"><img src={loadingIcon} alt="loading"></img></div>)
    }

    displayAlbum(){
        console.log(this.props.schedule);
        if(this.props.schedule){
            let albumDisplay = this.props.schedule.map(week => {
                return (<>
                    <div className="album-container">
                        <div className="bgl-week-header">{week.week + ' - ' + week.game}</div>
                        <div className="bgl-week-subheader">{week.dates}</div>
                        <div className="bgl-week-album-container">
                            {this.getSingleWeekAlbum(week, this.props.season)}
                        </div>        
                    </div>
                </>

                )
            });

            
            return albumDisplay;
        }

        return (<div>could not load album</div>);
    }

    getSingleWeekAlbum(week, season){
        return week.album.map((image, index) => {
            let imageFound = true;
            let imageURL = '';
            try{
                if(week.week.toLowerCase() === 'championship'){
                    imageURL = require("./images/" + season + '/' + 'championship' + '.JPG');
                }else{
                    imageURL = require("./images/" + season + '/' + image + '.JPG');
                }
            }catch(error){
                imageFound = false;
            }
            if(imageFound){
                imageURL = imageURL.default ? imageURL.default : imageURL;
                return (
                    <>
                        <div className="image-container">
                            <img className="gallery-image" src={imageURL} onError={this.hideImage} onClick={this.enlargeImage}/>
                        </div>
                    </>
                )
            }

            return (<></>);
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
                    <img src={cancelIcon} className="close-large-image-button" onClick={this.closeLargeImageDisplay}></img>
                    <div className="large-image-display">
                        <img className="focused-image" src={this.state.largeImage} onClick={this.closeLargeImageDisplay}/>
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
