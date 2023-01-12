import React from "react";
import './App.css';
// import AppContainer from "./create/AppContainer";
//import { BrowserRouter as Router,Routes, Route, Link } from 'react-router-dom';
// import ViewOnlyAppContainer from "./view/ViewOnlyAppContainer";
// import VerifyEmailContainer from "./verifyEmail/VerifyEmailContainer";
// import LandingNav from "./landing/LandingNavigation";
import DataContainer from "./DataContainer";

class App extends React.Component {

  constructor(props){
    super(props);
    this.state = {};

  }

  render(){
 
    return (
    <>
    
    <head>
          <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'/>
          <meta charset="utf-8"/>
          <meta http-equiv="X-UA-Compatible" content="IE=edge,chrome=1"/>
          <meta name='viewport' content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0'/>
          <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.2.0/css/font-awesome.min.css" rel="stylesheet"/>
          <link href='https://fonts.googleapis.com/css?family=Holtwood+One+SC' rel='stylesheet' type='text/css'/>
          <link href='https://fonts.googleapis.com/css?family=Kaushan+Script|Herr+Von+Muellerhoff' rel='stylesheet' type='text/css'/>
          <link href='https://fonts.googleapis.com/css?family=Abel' rel='stylesheet' type='text/css'/>
          <link href='https://fonts.googleapis.com/css?family=Istok+Web|Roboto+Condensed:700' rel='stylesheet' type='text/css'/>
            
          <title>Board Game League</title>
        </head>
        
        {/* <Router> */}
           <div className="App main-container">
            <DataContainer></DataContainer>
           {/* <Routes>
                 <Route exact path='/' element={<LandingNav/>}></Route>
                 <Route exact path='/view' element={< ViewOnlyAppContainer />}></Route>
                 <Route exact path='/create' element={< AppContainer />}></Route>
                 <Route exact path='/verify-email' element={< VerifyEmailContainer />}></Route>
          </Routes> */}
          </div>
       {/* </Router> */}
    </>
    );
  }
}

export default App;
