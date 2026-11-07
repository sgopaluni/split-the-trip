import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import './styles.css';
class ErrorBoundary extends React.Component{state={error:null};static getDerivedStateFromError(error){return{error}}render(){if(this.state.error)return <div className="loading"><h1>Let’s get back on the road.</h1><p>Something unexpected happened. Your saved data is still on this device.</p><button className="button primary" onClick={()=>location.reload()}>Reload SplitTheTrip</button><details><summary>Technical details</summary><pre>{this.state.error.message}</pre></details></div>;return this.props.children}}
createRoot(document.getElementById('root')).render(<React.StrictMode><ErrorBoundary><App/></ErrorBoundary></React.StrictMode>);
