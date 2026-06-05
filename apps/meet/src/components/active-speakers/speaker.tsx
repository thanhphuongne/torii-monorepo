import { Mic } from 'lucide-react';
import { IActiveSpeaker } from '@/store/slices/interfaces/active-speakers';

interface ISpeakerProps {
  speaker: IActiveSpeaker;
}
const SpeakerComponent = ({ speaker }: ISpeakerProps) => {
  return (
    <div className="m-1 px-3 py-0.5 text-[11px] font-semibold rounded-full inline-flex items-center bg-primary text-primary-foreground shadow-sm">
      <Mic className="w-2.5 h-2.5 ltr:mr-1.5 rtl:ml-1.5 opacity-90" />
      {speaker.name}
    </div>
  );
};

export default SpeakerComponent;
