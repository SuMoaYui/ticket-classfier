import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import kinAvatar from '@/assets/kin-avatar.png';
import './ChatWidget.css';

export function ChatWidget() {
  const { 
    isOpen, toggleChat, messages, isTyping, sendMessage, 
    hasSeenProactiveGreeting, markProactiveGreeted 
  } = useChatStore();
  
  const [inputText, setInputText] = useState('');
  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al fondo cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping, isOpen]);

  // Contexto de ubicación y saludos proactivos
  useEffect(() => {
    if (!isOpen) return; // KIN solo analiza el contexto proactivo si la ventana está abierta

    const routeMap: Record<string, string> = {
      '/dashboard': 'Panel Principal de Análisis',
      '/tickets': 'Lista de Tickets',
      '/create-ticket': 'Creación de Nuevos Tickets',
      '/settings': 'Ajustes del Sistema y API',
    };
    
    // Obtenemos un texto semántico de dónde está el usuario
    const contextPage = routeMap[location.pathname] || 'Menú ' + location.pathname;

    // Si abren por primera vez o si acaban de recargar, saludamos basado en dónde abrieron el chat
    if (!hasSeenProactiveGreeting) {
      markProactiveGreeted();
      sendMessage('__PROACTIVE__', contextPage);
    }
  }, [location.pathname, isOpen, hasSeenProactiveGreeting, sendMessage, markProactiveGreeted]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;
    
    const routeMap: Record<string, string> = {
      '/dashboard': 'Panel Principal',
      '/tickets': 'Lista de Tickets',
      '/create-ticket': 'Creación de Tickets',
      '/settings': 'Ajustes',
    };
    const contextPage = routeMap[location.pathname] || location.pathname;
    
    const sendingText = inputText;
    setInputText('');
    await sendMessage(sendingText, contextPage);
  };

  return (
    <>
      <button className={`chat-fab ${isOpen ? 'hidden' : ''}`} onClick={toggleChat} title="Hablar con KIN">
         <img src={kinAvatar} alt="KIN" />
      </button>

      {isOpen && (
        <div className="chat-window">
          <div className="chat-header">
            <img src={kinAvatar} alt="KIN" className="chat-header-avatar" />
            <div className="chat-header-info">
              <h3>KIN</h3>
              <span>Nivel: Inteligencia Activa</span>
            </div>
            <button className="chat-close" onClick={toggleChat} title="Cerrar">&times;</button>
          </div>
          
          <div className="chat-messages">
            {messages.map((m) => (
              <div key={m.id} className={`chat-bubble ${m.sender}`}>
                <p>{m.text}</p>
                <span className="timestamp">
                  {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble kin typing">
                <span></span><span></span><span></span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form className="chat-input-area" onSubmit={handleSend}>
            <input 
              type="text" 
              placeholder="Pregúntale a KIN sobre esta pantalla..." 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isTyping}
            />
            <button type="submit" disabled={isTyping || !inputText.trim()}>
              Enviar
            </button>
          </form>
        </div>
      )}
    </>
  );
}
