/** Small Markdown subset rendered as React text; raw HTML and links are never interpreted. */
export function ProductDescription({ text }: { text: string }) {
  return <div className="description">{text.split(/\n\s*\n/).map((block,index)=>{
    const lines=block.trim().split("\n");
    if(lines.every(line=>line.startsWith("- ")))return <ul key={index}>{lines.map((line,i)=><li key={i}>{line.slice(2)}</li>)}</ul>;
    if(lines[0]?.startsWith("## "))return <section key={index}><h3>{lines[0].slice(3)}</h3>{lines.length>1&&<p>{lines.slice(1).join("\n")}</p>}</section>;
    return <p key={index}>{block}</p>;
  })}</div>;
}
