function doGet(e){
  if(e.parameter.action==='lookupZip') return doGet_lookupZip(e);
  const tpl=HtmlService.createTemplateFromFile('index');
  tpl.serverTime=new Date().toISOString();
  return tpl.evaluate()
    .setTitle('外壁塗装くらべる')
    .addMetaTag('viewport','width=device-width,initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}