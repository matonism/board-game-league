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
