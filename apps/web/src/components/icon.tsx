import {solarIcons} from "@/lib/preview/solar-icons";
export function Icon({name}:{name:keyof typeof solarIcons}){
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" dangerouslySetInnerHTML={{__html:solarIcons[name].body}}/>;
}
