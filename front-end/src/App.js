import React from "react";
import './App.css';
import DataContainer from "./DataContainer";

class App extends React.Component {

  constructor(props){
    super(props);
    this.state = {};

  }

  render(){
 
    return (
    <>
          <div className="App main-container">
            <DataContainer></DataContainer>
          </div>
    </>
    );
  }
}

export default App;
