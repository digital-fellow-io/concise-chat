import React, { useState, useRef, useEffect } from "react";
import { Send, Trash2, Sparkles, User, ChevronDown, Copy, Edit2, Check, X } from "lucide-react";

const ChatUI = () => {
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem("chatMessages");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            type: "bot",
            text: "Hi, I'm an AI assistant! How can I help you today?",
            model: "haiku",
          },
        ];
  });

  const [inputValue, setInputValue] = useState("");
  const [selectedModel, setSelectedModel] = useState("haiku");
  const [conciseMode, setConciseMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editText, setEditText] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const messagesEndRef = useRef(null);
  const dropdownRef = useRef(null);

  const modelConfig = {
    haiku: {
      name: "Claude",
      icon: "⚡",
      color: "purple",
      apiModel: "anthropic/claude-3.5-haiku",
    },
    gpt35: {
      name: "ChatGPT",
      icon: "🚀",
      color: "green",
      apiModel: "openai/gpt-3.5-turbo",
    },
    gemini: {
      name: "Gemini",
      icon: "🌙",
      color: "blue",
      apiModel: "google/gemini-3.1-flash-lite-preview",
    },

  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ensure intro message appears if no saved history
  useEffect(() => {
    const saved = localStorage.getItem("chatMessages");
    if (!saved || JSON.parse(saved).length === 0) {
      const introMessage = {
        id: 1,
        type: "bot",
        text: "Hi, I'm an AI assistant! How can I help you today?",
        model: "haiku",
      };
      setMessages([introMessage]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatMessagesForAPI = (msgs, limit = 30) => {
    return msgs.slice(-limit).map(
      (msg) =>
        msg.type === "user"
          ? { role: "user", content: msg.text }
          : { role: "assistant", content: msg.text }
    );
  };

  const handleCopyMessage = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleEditMessage = (message) => {
    setEditingMessageId(message.id);
    setEditText(message.text);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText("");
  };

  const handleSubmitEdit = async () => {
    if (!editText.trim() || isLoading) return;

    const editIndex = messages.findIndex(msg => msg.id === editingMessageId);
    if (editIndex === -1) return;

    const messagesUpToEdit = messages.slice(0, editIndex);
    
    const updatedMessage = {
      ...messages[editIndex],
      text: editText,
    };

    setMessages([...messagesUpToEdit, updatedMessage]);
    setEditingMessageId(null);
    setEditText("");
    setIsLoading(true);

    try {
      const model = modelConfig[selectedModel].apiModel;
      const messageHistory = formatMessagesForAPI(messagesUpToEdit, 30);

      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          userMessage: editText,
          conciseMode,
          messageHistory,
        }),
      });

      if (!res.ok) throw new Error("API error " + res.status);

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "No reply";

      const botMessage = {
        id: Date.now() + 1,
        type: "bot",
        text: reply,
        model: selectedModel,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: Date.now() + 1,
        type: "bot",
        text: "Sorry, there was an error processing your request.",
        model: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessageText = inputValue;
    setInputValue("");
    setIsLoading(true);

    const userMessage = {
      id: Date.now(),
      type: "user",
      text: userMessageText,
      model: selectedModel,
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const model = modelConfig[selectedModel].apiModel;
      const messageHistory = formatMessagesForAPI(messages, 30);

      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          userMessage: userMessageText,
          conciseMode,
          messageHistory,
        }),
      });

      if (!res.ok) throw new Error("API error " + res.status);

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "No reply";

      const botMessage = {
        id: Date.now() + 1,
        type: "bot",
        text: reply,
        model: selectedModel,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = {
        id: Date.now() + 1,
        type: "bot",
        text: "Sorry, there was an error processing your request.",
        model: selectedModel,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const introMessage = {
      id: Date.now(),
      type: "bot",
      text: "Hi, I'm an AI assistant! How can I help you today?",
      model: "haiku",
    };

    setMessages([introMessage]);
    localStorage.setItem("chatMessages", JSON.stringify([introMessage]));
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (editingMessageId) {
        handleSubmitEdit();
      } else {
        handleSend();
      }
    }
  };

  const getModelColor = (model) => {
    const colors = {
      purple: "bg-purple-100 text-purple-700 border-purple-200",
      green: "bg-green-100 text-green-700 border-green-200",
      blue: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return colors[modelConfig[model].color];
  };

  // const getModelBadgeColor = (model) => {
  //   const colors = {
  //     purple: "text-purple-600 bg-purple-50",
  //     green: "text-green-600 bg-green-50",
  //     blue: "text-blue-600 bg-blue-50",
  //   };
  //   return colors[modelConfig[model].color];
  // };
  const getModelBadgeColor = (model) => {
  const colors = {
    purple: "text-purple-600 bg-purple-50",
    green: "text-green-600 bg-green-50",
    blue: "text-blue-600 bg-blue-50",
  };
  const config = modelConfig[model] || modelConfig[Object.keys(modelConfig)[0]];
  return colors[config.color];
};

  // Find the last user message (no longer needed since we allow editing any user message)
  // const lastUserMessageId = [...messages].reverse().find(msg => msg.type === 'user')?.id;

  return (
    <div className="flex items-center text-sm sm:text-m justify-center min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div
        className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ height: "90vh" }}
      >
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">CoThink</h1>
                <p className="text-sm text-gray-500">
                  {messages.length} messages
                </p>
              </div>
            </div>
            <button
              onClick={handleClearChat}
              className="flex items-center ml-7 text-sm gap-2 px-4 py-1 sm:py-2 text-gray-700 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear Chat
            </button>   
          </div>

          {/* Model Selection Dropdown & Concise Mode */}
          <div className="flex items-center justify-between">
            {/* Model Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all border ${getModelColor(
                  selectedModel
                )}`}
              >
                <span>{modelConfig[selectedModel].icon}</span>
                <span>{modelConfig[selectedModel].name}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${
                    isDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isDropdownOpen && (
                <div className="absolute top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  {Object.entries(modelConfig).map(([key, config]) => (
                    <button
                      key={key}
                      onClick={() => {
                        setSelectedModel(key);
                        setIsDropdownOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition-colors ${
                        selectedModel === key ? "bg-gray-50" : ""
                      }`}
                    >
                      <span className="text-lg">{config.icon}</span>
                      <span className="font-medium text-gray-700">
                        {config.name}
                      </span>
                      {selectedModel === key && (
                        <span className="ml-auto text-purple-600">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Concise Mode Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-xs ml-9 sm:text-sm font-medium text-gray-700">
                Concise Mode
              </span>
              <button
                onClick={() => setConciseMode(!conciseMode)}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  conciseMode ? "bg-purple-600" : "bg-gray-300"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                    conciseMode ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.type === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                  message.type === "user" ? "bg-blue-500" : "bg-purple-500"
                }`}
              >
                {message.type === "user" ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Sparkles className="w-5 h-5 text-white" />
                )}
              </div>
              <div
                className={`flex flex-col ${
                  message.type === "user" ? "items-end" : "items-start"
                } w-full group`}
              >
                {editingMessageId === message.id ? (
                  // Edit Mode - 60% Width
                  <div className="w-[60%]">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="w-full px-4 py-3 bg-gray-50 border border-purple-300 rounded-2xl resize-none outline-none text-gray-800 focus:border-purple-500"
                      rows="3"
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={handleSubmitEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                      >
                        <Check className="w-3 h-3" />
                        Submit
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Normal Message Display
                  <div className={`${message.type === "user" ? "max-w-[70%]" : "max-w-[70%]"} w-auto`}>
                    <div
                      className={`px-4 py-3 rounded-2xl ${
                        message.type === "user"
                          ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {message.text}
                      </p>
                    </div>
                    
                    {/* Action buttons and model badge in same row for bot, separate for user */}
                    {message.type === "bot" ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${getModelBadgeColor(
                            message.model
                          )}`}
                        >
                          {modelConfig[message.model]?.name || "AI"}
                        </span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopyMessage(message.text, message.id)}
                            className="p-1.5 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all border border-gray-200"
                            title="Copy message"
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      // User message buttons - right aligned
                      <div className="flex gap-1 mt-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleCopyMessage(message.text, message.id)}
                          className="p-1.5 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all border border-gray-200"
                          title="Copy message"
                        >
                          {copiedMessageId === message.id ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-gray-600" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEditMessage(message)}
                          className="p-1.5 bg-white rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50 transition-all border border-gray-200"
                          title="Edit and resubmit"
                        >
                          <Edit2 className="w-3 h-3 text-gray-600" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-200 p-6 bg-white">
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-gray-50 rounded-2xl border border-gray-200 focus-within:border-purple-500 transition-colors">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything..."
                className="w-full px-4 py-3 bg-transparent resize-none outline-none text-gray-800 placeholder-gray-400"
                rows="2"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-2xl hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg shadow-purple-500/30"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatUI;