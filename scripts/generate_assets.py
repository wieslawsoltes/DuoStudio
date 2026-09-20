"""Generate original, redistributable landscape studies and a synthesized soundtrack.
No downloaded photographs, brand assets, fonts, or copyrighted recordings are needed.
Python: Pillow + numpy. Video assembly: ffmpeg (optional).
"""
from pathlib import Path
import math, wave, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'assets'; OUT.mkdir(exist_ok=True)
W,H=1200,840
rng=np.random.default_rng(8064)
def lerp(a,b,t):return np.asarray(a)*(1-t)+np.asarray(b)*t
def gradient(top, bottom):
 t=np.linspace(0,1,H)[:,None,None]
 a=np.broadcast_to(lerp(top,bottom,t),(H,W,3)).copy()
 return Image.fromarray(np.uint8(np.clip(a,0,255)))
def finish(im, name):
 a=np.asarray(im.convert('RGB')).astype(float); grain=rng.normal(0,1.4,(H,W,1)); a=np.clip(a+grain,0,255)
 im=Image.fromarray(np.uint8(a));im.save(OUT/f'{name}.jpg',quality=87,optimize=True)
 return im
# A cinematic original desert study, with many mathematically smooth ridgelines.
for name,sky,land in [('dunes',((48,28,67),(238,148,132)),((220,133,114),(45,28,70))),('golden',((44,61,89),(252,205,157)),((225,146,94),(71,57,80)))]:
 im=gradient(*sky); glow=Image.new('RGBA',(W,H)); gd=ImageDraw.Draw(glow)
 gd.ellipse((790,125,960,295),fill=(255,235,200,230));glow=glow.filter(ImageFilter.GaussianBlur(1.3));im=Image.alpha_composite(im.convert('RGBA'),glow)
 d=ImageDraw.Draw(im)
 for i in range(11):
  yy=340+i*42; col=tuple(np.uint8(lerp(land[0],land[1],i/11)))
  points=[(x,yy+70*math.sin(x/W*4.6+i*.58)+18*math.sin(x/W*7+i*.45)) for x in range(0,W+4,4)]
  d.polygon(points+[(W,H),(0,H)],fill=col)
  if i>5:
   for j in range(7):
    p=[(x,y+7+j*8) for x,y in points]
    d.line(p,fill=tuple(max(0,c-6) for c in col),width=1)
 finish(im,name)
# Alpine blue-hour illustration.
im=gradient((14,28,67),(162,183,203));d=ImageDraw.Draw(im)
for i in range(360):
 x,y=rng.integers(0,W),rng.integers(0,330);r=rng.choice([.5,.8,1.2]);c=int(rng.integers(130,245));d.ellipse((x-r,y-r,x+r,y+r),fill=(c,c,min(255,c+12)))
d.ellipse((900,82,964,146),fill=(234,236,244))
for layer in range(5):
 base=460+layer*76; points=[(x,base-int(95*abs(math.sin(x/110+layer*.7)))-int(85*abs(math.sin(x/239+layer)))) for x in range(-50,W+80,38)]
 col=(64-layer*10,92-layer*13,120-layer*15);d.polygon(points+[(W,H),(0,H)],fill=col)
 if layer<3:
  for j,(x,y) in enumerate(points[1:-1],1):
   if y<points[j-1][1] and y<points[j+1][1]:d.polygon([(x,y),(x+45,y+72),(x+17,y+42),(x+6,y+51),(x-27,y+45)],fill=(184-layer*24,199-layer*20,213-layer*16))
for i in range(230):
 x=rng.integers(0,W); y=rng.integers(650,H+60); h=rng.integers(30,140);d.polygon([(x,y-h),(x-h*.24,y),(x+h*.24,y)],fill=(12,31,43))
finish(im,'alpine')
# Coastal topographic scene, made with continuous contour fields.
x,y=np.meshgrid(np.linspace(-1,1,W),np.linspace(-1,1,H));field=x*.62+y*.18+.22*np.sin(y*4)+.06*np.sin(y*17+x*2)
sea=np.zeros((H,W,3)); t=np.clip((field+.6)/1.4,0,1)[...,None];sea=lerp((8,61,86),(54,191,180),t)
landmask=field>.20
coast=lerp((239,210,152),(112,133,92),np.clip((field-.2)*1.6,0,1)[...,None]);sea=np.where(landmask[...,None],coast,sea)
foam=np.exp(-((field-.19)/.018)**2)[...,None];sea=lerp(sea,(236,251,227),foam*.83)
for off in [.08,-.06,-.24]:
 foam=np.exp(-((field-off)/.009)**2)[...,None];sea=lerp(sea,(204,249,236),foam*.21)
im=Image.fromarray(np.uint8(np.clip(sea,0,255)));d=ImageDraw.Draw(im)
for i in range(12):
 px,py=rng.integers(850,1150),rng.integers(70,760)
 d.ellipse((px-22,py-7,px+37,py+18),fill=(130,144,104));d.ellipse((px-20,py-25,px+21,py+13),fill=(70,103,80))
finish(im,'coast')
# Studio architecture. Perspective, light, and rounded arches.
im=gradient((199,183,163),(240,224,201));d=ImageDraw.Draw(im)
d.polygon([(0,520),(1200,430),(1200,840),(0,840)],fill=(180,155,132))
for i in range(6,-1,-1):
 left=70+i*124;top=105+i*17;right=left+175;bottom=685-i*20
 d.rectangle((left+15,top+95,right+22,bottom+20),fill=(112+i*9,96+i*9,89+i*8))
 d.rounded_rectangle((left,top,right,bottom),radius=88,fill=(231-i*7,217-i*6,192-i*4))
 d.rounded_rectangle((left+27,top+35,right-27,bottom+40),radius=65,fill=(93+i*13,86+i*11,82+i*10))
 d.rectangle((left+27,top+126,right-27,bottom+40),fill=(93+i*13,86+i*11,82+i*10))
d.polygon([(0,775),(700,525),(940,570),(210,840),(0,840)],fill=(227,204,174))
finish(im,'arches')
# Ray-traced-looking orbital study. Analytic sphere normals + studio lighting.
x,y=np.meshgrid(np.linspace(-1.43,1.43,W),np.linspace(1,-1,H));bg=lerp((19,25,46),(101,68,96),np.clip((1-y)*.4,0,1)[...,None]);r=np.sqrt((x-.13)**2+(y-.08)**2);inside=r<.63
z=np.sqrt(np.maximum(0,.63**2-(x-.13)**2-(y-.08)**2))/.63
nx=(x-.13)/.63;ny=(y-.08)/.63
light=np.clip(nx*-.45+ny*.6+z*.7,0,1);sphere=lerp((24,57,85),(224,227,232),light[...,None]**1.5)
edge=(1-z)**4;sphere=lerp(sphere,(200,165,238),edge[...,None]*.5)
stripe=np.sin((nx*1.2+ny*.5+z*.9)*16);sphere+=stripe[...,None]*np.array([3,9,13])
bg=np.where(inside[...,None],sphere,bg)
finish(Image.fromarray(np.uint8(np.clip(bg,0,255))),'orbital')
# Soundtrack: original, gentle three-voice ambient chords. No autoplay in the app.
sr=22050;duration=16;t=np.arange(sr*duration)/sr;audio=np.zeros_like(t)
for j,chord in enumerate([(130.81,164.81,196),(110,130.81,164.81),(87.31,110,130.81),(98,123.47,146.83)]):
 start=j*4;local=t-start;env=np.clip(local/.9,0,1)*np.clip((4.7-local)/1.5,0,1);env*=((local>=0)&(local<4.7))
 for f in chord:audio+=env*(np.sin(2*np.pi*f*t)+.23*np.sin(2*np.pi*f*2*t))*.055
fade=np.minimum(np.clip(t/.2,0,1),np.clip((duration-t)/.9,0,1));audio*=fade
with wave.open(str(OUT/'ambient.wav'),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(sr);w.writeframes(np.int16(audio*32767).tobytes())
for name in ['dunes','coast','alpine']:
 # Original moving-image studies: Ken Burns camera across the generated art.
 cmd=['ffmpeg','-v','error','-y','-loop','1','-i',str(OUT/f'{name}.jpg'),'-i',str(OUT/'ambient.wav'),'-vf',"scale=1280:896,zoompan=z='1.07+0.00019*on':x='iw/2-(iw/zoom/2)+18*sin(on/160)':y='ih/2-(ih/zoom/2)':d=384:s=640x360:fps=24,format=yuv420p",'-t','16','-c:v','libx264','-preset','fast','-crf','25','-c:a','aac','-b:a','64k','-movflags','+faststart',str(OUT/f'{name}.mp4')]
 subprocess.run(cmd,check=True,timeout=100)
print('Generated original assets:',[(p.name,p.stat().st_size) for p in OUT.iterdir()])
