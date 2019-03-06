import React, { Component } from 'react';
import './App.css';



const KudosItem = (props) => (
  <li className="box">
    <h2>{props.title}</h2>
    <h4>{props.body}</h4>
    <p><em>Sent to: {props.sender} From: {props.recipient} </em></p>
  </li>
);


class App extends Component {
  state = {
    kudos: [],
    users: [],
  };

  componentDidMount() {
      // Call our fetch function below once the component mounts
    this.callKudos()
      .then(res => this.setState({kudos: res}))
      .catch(err => console.log(err));
    this.callUsers()
      .then(res => this.setState({users: res}))
      .catch(err => console.log(err));
  }
    // Fetches our GET route from the Express server. (Note the route we are fetching matches the GET route from server.js
  callKudos = async () => {
    const response = await fetch('/api/kudos');
    console.log(response);
    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message) 
    }
    return body;
  };
  callUsers = async () => {
    const response = await fetch('/api/users');
    console.log(response);
    const body = await response.json();

    if (response.status !== 200) {
      throw Error(body.message) 
    }
    return body;
  };



  render() {
    const kudosArray = this.state.kudos;
    console.log(kudosArray)
    return (
      <div>
          <h1 className="App-header">Tiny Improvements</h1>
          <ul>
            <li className="infoBox"> <h2>Give Kudos by texting (470) 243-2313</h2> <h4>SMS format: "Hey Bob, You are killing it! Last week you made a killer app. -Jack"</h4></li>
            {kudosArray.map(kudos => <KudosItem title={kudos.title} body={kudos.body} sender={kudos.sender.name} recipient={kudos.recipient.name} key={kudos._id} />)}
          </ul>
      </div>
    );
  }
}

export default App;
