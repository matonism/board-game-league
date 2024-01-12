import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import PullToRefresh from 'pulltorefreshjs';
// import * as serviceWorkerRegistration from './serviceWorkerRegistration';

let refreshCount = 0;
const queryClient = new QueryClient();

const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>
        <App />
        </QueryClientProvider>
    </React.StrictMode>
);

const standalone = navigator.standalone || window.matchMedia("(display-mode: standalone)").matches;
if (standalone) {
    PullToRefresh.init({
        onRefresh() {
            // console.log('refreshing')
            // window.location.reload();

            if(refreshCount < 2){
                queryClient.invalidateQueries();
                refreshCount++;
                setTimeout(() => {
                    refreshCount--;
                }, 10000)
            }
        },
    });
}


// ReactDOM.render(
//   document.getElementById('root')
// );

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
// serviceWorkerRegistration.register();
