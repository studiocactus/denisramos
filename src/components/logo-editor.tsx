"use client";
import {useState} from "react";
import {ArrowUp} from "@phosphor-icons/react";
import {Button} from "./ui/button";
import {Input} from "./ui/input";
type Logo={name:string;src:string};
export default function LogoEditor({logos,onChange}:{logos:Logo[];onChange:(logos:Logo[])=>void}){
 const [busy,setBusy]=useState(false);const [error,setError]=useState("");
 async function upload(files:File[]){
  setError("");setBusy(true);
  try{
   if(logos.length+files.length>20)throw new Error("Use até 20 logos nesta demonstração.");
   const results:Logo[]=[];
   for(const file of files){
    if(!/\.(png|jpe?g|svg)$/i.test(file.name))throw new Error("Selecione arquivos PNG, JPG ou SVG.");
    if(file.size>2*1024*1024)throw new Error("Cada arquivo deve ter até 2 MB.");
    const url=URL.createObjectURL(file);
    try{
     const img=new Image();img.src=url;await img.decode();
     const scale=Math.min(1,600/img.naturalWidth,240/img.naturalHeight);
     const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
     const ctx=canvas.getContext("2d");if(!ctx)throw new Error("Não foi possível preparar a imagem.");
     ctx.drawImage(img,0,0,canvas.width,canvas.height);
     results.push({name:file.name.replace(/\.[^.]+$/,""),src:canvas.toDataURL("image/png")});
    }finally{URL.revokeObjectURL(url)}
   }
   const next=[...logos,...results];if(JSON.stringify(next).length>2500000)throw new Error("As imagens excedem o espaço da demonstração. Remova alguns logos ou use arquivos menores.");
   onChange(next);
  }catch(e){setError(e instanceof Error?e.message:"Não foi possível abrir esta imagem.")}finally{setBusy(false)}
 }
 return <fieldset className="editor-group"><legend>Logos dos clientes</legend><p className="muted">Recomendado: 600 × 240 px, com margem ao redor do logo. PNG, SVG ou JPG · até 2 MB por arquivo. As imagens são preparadas para exibição e publicadas ao clicar em Salvar no site.</p><label className="field">Adicionar logos<input disabled={busy} type="file" accept=".png,.svg,.jpg,.jpeg" multiple onChange={e=>{void upload(Array.from(e.target.files||[]));e.target.value=""}}/></label>{busy&&<p role="status">Preparando logos…</p>}{error&&<p role="alert">{error}</p>}{logos.map((logo,i)=><div className="logo-editor-row" key={i}><img src={logo.src} alt=""/><label className="field">Nome do cliente<Input required maxLength={80} value={logo.name} onChange={e=>onChange(logos.map((l,n)=>n===i?{...l,name:e.target.value}:l))}/></label><Button type="button" variant="outline" size="icon" disabled={busy||i===0} onClick={()=>{const next=[...logos];[next[i-1],next[i]]=[next[i],next[i-1]];onChange(next)}} aria-label={`Mover ${logo.name} para antes`}><ArrowUp size={18} /></Button><Button type="button" variant="outline" disabled={busy} onClick={()=>onChange(logos.filter((_,n)=>n!==i))}>Remover</Button></div>)}</fieldset>
}
