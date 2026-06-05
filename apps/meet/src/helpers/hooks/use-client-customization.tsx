import { useEffect } from 'react';
import { updateFocusActiveSpeakerWebcam } from '@/store/slices/roomSettingsSlice';
import { useAppDispatch } from '@/store';
import { FOCUS_ACTIVE_SPEAKER_WEBCAM, DESIGN_CUSTOMIZATION } from '@/config';

export interface ICustomDesignParams {
  primary_color?: string;
  primary_btn_bg_color?: string;
  primary_btn_text_color?: string;

  secondary_color?: string;
  secondary_btn_bg_color?: string;
  secondary_btn_text_color?: string;

  background_color?: string;
  background_image?: string;

  header_bg_color?: string;
  footer_bg_color?: string;
  footer_icon_bg_color?: string;
  footer_icon_color?: string;

  // @deprecated  Use `side-panel-bg-color` instead.
  right_side_bg_color?: string;
  side_panel_bg_color?: string;

  custom_css_url?: string;
  custom_logo?: string;
}

const useClientCustomization = () => {
  const dispatch = useAppDispatch();

  // different config related customization
  useEffect(() => {
    const focusActiveSpeakerWebcam = FOCUS_ACTIVE_SPEAKER_WEBCAM;
    dispatch(updateFocusActiveSpeakerWebcam(focusActiveSpeakerWebcam));
  }, [dispatch]);

  // design customization
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    let customDesign: any = urlParams.get('custom_design');

    if (!customDesign || customDesign === '{}') {
      customDesign = DESIGN_CUSTOMIZATION;
    }

    if (!customDesign) {
      return;
    }

    let designCustomParams: ICustomDesignParams | undefined;
    if (typeof customDesign === 'object') {
      designCustomParams = customDesign;
    } else {
      try {
        designCustomParams = JSON.parse(customDesign);
      } catch (e) {
        return;
      }
    }

    if (!designCustomParams) {
      return;
    }

    let css = '';

    if (designCustomParams.primary_color) {
      css += `
        :root {
          --primary: ${designCustomParams.primary_color};
          --primary-foreground: #ffffff; /* Assuming white text on primary for now, could be calculated */
          --ring: ${designCustomParams.primary_color};
        }
      `;
      // Legacy support for transition period if needed, or remove if confident
      css += `
        body:not(.dark) .primaryColor { color: ${designCustomParams.primary_color}; }
        body:not(.dark) .text-primary { color: ${designCustomParams.primary_color}; }
        body:not(.dark) .bg-primary { background-color: ${designCustomParams.primary_color} !important; }
        body:not(.dark) .border-primary { border-color: ${designCustomParams.primary_color} !important; }
      `;
      css +=
        'body:not(.dark) .excalidraw {\n' +
        '    --color-primary: ' +
        designCustomParams.primary_color +
        ';\n' +
        '    --color-primary-darker: ' +
        designCustomParams.primary_color +
        ';\n' +
        '    --color-primary-darkest: ' +
        designCustomParams.primary_color +
        ';\n' +
        '}';
    }

    if (designCustomParams.secondary_color) {
      css += `
        :root {
          --secondary: ${designCustomParams.secondary_color};
          --secondary-foreground: #ffffff;
        }
      `;
      css += `
        body:not(.dark) .secondaryColor { color: ${designCustomParams.secondary_color} !important; }
        body:not(.dark) .text-secondary { color: ${designCustomParams.secondary_color} !important; }
        body:not(.dark) .bg-secondary { background-color: ${designCustomParams.secondary_color} !important; }
        body:not(.dark) .border-secondary { border-color: ${designCustomParams.secondary_color} !important; }
      `;
      css +=
        'body:not(.dark) .excalidraw {\n' +
        '    --color-primary-light: ' +
        designCustomParams.secondary_color +
        ';\n' +
        '}';
    }

    if (designCustomParams.background_image) {
      css += `body:not(.dark) #main-area { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        }`;
      css += `body:not(.dark) .error-app-bg { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        }`;
      css += `body:not(.dark) .waiting-room { 
        background: url("${designCustomParams.background_image}") !important;
        background-position: center !important;
        background-repeat: no-repeat !important;
        background-size: cover !important;
        }`;
    } else if (designCustomParams.background_color) {
      css += `body:not(.dark) #main-area { 
        background: ${designCustomParams.background_color} !important;
        }`;
      css += `body:not(.dark) .error-app-bg { 
        background: ${designCustomParams.background_color} !important;
        }`;
      css += `body:not(.dark) .waiting-room { 
        background: ${designCustomParams.background_color} !important;
        }`;
    }

    if (designCustomParams.header_bg_color) {
      css +=
        'body:not(.dark) header#main-header { background: ' +
        designCustomParams.header_bg_color +
        '; }';
    }

    if (designCustomParams.footer_bg_color) {
      css +=
        'body:not(.dark) footer#main-footer { background: ' +
        designCustomParams.footer_bg_color +
        '; }';
    }

    if (designCustomParams.footer_icon_bg_color) {
      css +=
        'body:not(.dark) .footer-icon-bg { background: ' +
        designCustomParams.footer_icon_bg_color +
        '; }';
    }
    if (designCustomParams.footer_icon_color) {
      css +=
        'body:not(.dark) .footer-icon-bg { color: ' +
        designCustomParams.footer_icon_color +
        '; }';
    }
    if (designCustomParams.primary_btn_bg_color) {
      css +=
        'body:not(.dark) .primary-button { background: ' +
        designCustomParams.primary_btn_bg_color +
        '; }';
    }
    if (designCustomParams.primary_btn_text_color) {
      css +=
        'body:not(.dark) .primary-button { color: ' +
        designCustomParams.primary_btn_text_color +
        '; }';
    }
    if (designCustomParams.secondary_btn_bg_color) {
      css +=
        'body:not(.dark) .secondary-button { background: ' +
        designCustomParams.secondary_btn_bg_color +
        '; }';
    }
    if (designCustomParams.secondary_btn_text_color) {
      css +=
        'body:not(.dark) .secondary-button { color: ' +
        designCustomParams.secondary_btn_text_color +
        '; }';
    }

    if (
      designCustomParams.right_side_bg_color ||
      designCustomParams.side_panel_bg_color
    ) {
      // with backward compatibility
      let color = designCustomParams.side_panel_bg_color;
      if (designCustomParams.right_side_bg_color) {
        color = designCustomParams.right_side_bg_color;
      }
      css +=
        'body:not(.dark) .side-panel-bg-color { background: ' + color + '; }';
    }

    const head = document.head;
    let link: HTMLLinkElement, style: HTMLStyleElement;

    if (designCustomParams.custom_css_url) {
      link = document.createElement('link');

      link.type = 'text/css';
      link.rel = 'stylesheet';
      link.href = designCustomParams.custom_css_url;

      head.appendChild(link);
    }

    if (css !== '') {
      style = document.createElement('style');
      style.id = 'toriiNihongoCustomization';
      style.textContent = css;
      head.appendChild(style);
    }

    return () => {
      if (css !== '') {
        head.removeChild(style);
      }
      if (designCustomParams.custom_css_url) {
        head.removeChild(link);
      }
    };
  }, [dispatch]);
};

export default useClientCustomization;
