import { EventBus } from "@/game/EventBus";
import { useEffect, useRef, useState } from "react"
import './index.less';
import icon from '@/assets/icon.png';
import no from '@/assets/no.png';
import yes from '@/assets/yes.png';
import text from '@/assets/text.png';
import model from "@/store";
const PopUp: React.FC  = () => {
  const [visible, setVisible] = useState<boolean>(false);
  const yesRef =  useRef<HTMLImageElement>(null);
  const noRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    EventBus.on('popup_show', () => {
      setVisible(true); 
      const canvas = document.querySelector('canvas')
      if (canvas) {
        canvas.style.filter = 'blur(5px)';
      }
   });
  }, []);


  const handleClick = (size: 'small'| 'big') => {
    const [{}, {update}] = model.getModel('game');
    update({size});
    if (size ==='small') {
      noRef.current?.classList.add('clicked')
    } else {
      yesRef.current?.classList.add('clicked')
    }
    EventBus.emit('click');
    setTimeout(() => {
      setVisible(false);
      const canvas = document.querySelector('canvas')
      if (canvas) {
        canvas.style.filter = 'unset';
      }
      if (size === 'big') {
        EventBus.emit('change_big')
      }
    }, 600)
    
  }

  return <div className={`cover ${visible ? 'show' : 'fadeout'}`}>
    <img src = {icon} className="icon"/>
    <img src = {text} className="text"/>
    <div className = "selections">
      <img src = {yes} className="yes" onClick={() => handleClick('big')} ref =  {yesRef}/>
      <img src = {no} className="no" onClick={() => handleClick('small')} ref = {noRef}/>
    </div>
  </div>
}

export default PopUp;