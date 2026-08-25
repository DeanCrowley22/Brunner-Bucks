"use client";
import Link from "next/link";import {ArrowLeft,Home,Maximize2} from "lucide-react";
export function DisplayControls({homeHref="/"}:{homeHref?:string}){return <div className="display-controls"><button onClick={()=>history.length>1?history.back():location.assign(homeHref)}><ArrowLeft size={18}/> Back</button><Link href={homeHref}><Home size={18}/> Class home</Link><button onClick={()=>document.documentElement.requestFullscreen?.()}><Maximize2 size={18}/> Full screen</button></div>}
