// Small typed bridge to the official IFrame Player API. No video is downloaded.
export type YouTubePlayer = {
  playVideo():void; pauseVideo():void; mute():void; unMute():void;
  destroy():void; getPlayerState():number;
  loadVideoById(options:{videoId:string;startSeconds:number;endSeconds:number}):void;
};
type PlayerEvent={target:YouTubePlayer};
type YouTubeAPI={Player:new(element:HTMLElement,options:{
  host:string;videoId:string;playerVars:Record<string,string|number>;
  events:{onReady:(event:PlayerEvent)=>void;onStateChange:(event:PlayerEvent&{data:number})=>void;onError:()=>void;onAutoplayBlocked:()=>void};
})=>YouTubePlayer};
declare global { interface Window {YT?:YouTubeAPI;onYouTubeIframeAPIReady?:()=>void} }
let pending:Promise<YouTubeAPI>|undefined;
export function loadYouTubeAPI():Promise<YouTubeAPI>{
  if(window.YT?.Player)return Promise.resolve(window.YT);
  if(pending)return pending;
  pending=new Promise<YouTubeAPI>((resolve,reject)=>{
    const previous=window.onYouTubeIframeAPIReady;
    const timeout=window.setTimeout(()=>{pending=undefined;reject(new Error("Video service is taking too long to respond."));},15000);
    window.onYouTubeIframeAPIReady=()=>{
      window.clearTimeout(timeout);previous?.();
      if(window.YT?.Player)resolve(window.YT);else{pending=undefined;reject(new Error("Video service is unavailable."));}
    };
    document.getElementById("wsb-youtube-api")?.remove();
    const script=document.createElement("script");script.id="wsb-youtube-api";
    script.src="https://www.youtube.com/iframe_api";script.async=true;
    script.onerror=()=>{window.clearTimeout(timeout);pending=undefined;script.remove();reject(new Error("Video service could not be loaded."));};
    document.head.appendChild(script);
  });
  return pending;
}
