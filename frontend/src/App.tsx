import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  MessageSquare, 
  TrendingUp, 
  Search, 
  Send,
  RefreshCw,
  AlertTriangle,
  Shield,
  Zap,
  Droplets
} from 'lucide-react'
import type { Pool, Message, ChatResponse, RiskLevel, Protocol } from './types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

function App() {
  const [pools, setPools] = useState<Pool[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<string>('')
  const [riskFilter, setRiskFilter] = useState<RiskLevel>('all')
  const [protocolFilter, setProtocolFilter] = useState<Protocol>('all')
  const [minApy, setMinApy] = useState<number>(0)

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'agent',
      content: 'Welcome to YieldScout! 👋\n\nI can help you:\n• Find the best yield pools on Solana\n• Compare Raydium vs Orca vs Marinade\n• Explain impermanent loss risks\n• Get detailed pool analytics\n\nTry asking: "What are the top 5 yield pools?"',
      timestamp: new Date()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Fetch pools data
  const fetchPools = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/yields`)
      if (!response.ok) throw new Error('Failed to fetch')
      const data = await response.json()
      setPools(data.pools || [])
      setLastUpdate(data.timestamp || new Date().toISOString())
    } catch (err) {
      console.error('Fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPools()
    const interval = setInterval(fetchPools, 300000) // Refresh every 5 minutes
    return () => clearInterval(interval)
  }, [fetchPools])

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Send message to agent
  const sendMessage = async () => {
    if (!inputValue.trim() || chatLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setChatLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content })
      })

      if (!response.ok) throw new Error('Chat request failed')

      const data: ChatResponse = await response.json()

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.text,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, agentMessage])

      // Refresh pools if response contains them
      if (data.content?.pools) {
        setPools(data.content.pools)
      }
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setChatLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Filter pools
  const filteredPools = pools.filter(pool => {
    if (riskFilter !== 'all' && pool.riskLevel !== riskFilter) return false
    if (protocolFilter !== 'all' && pool.protocol !== protocolFilter) return false
    if (pool.apy < minApy) return false
    return true
  }).sort((a, b) => b.apy - a.apy)

  const formatTVL = (tvl: number) => {
    if (tvl >= 1e9) return `$${(tvl / 1e9).toFixed(2)}B`
    if (tvl >= 1e6) return `$${(tvl / 1e6).toFixed(2)}M`
    if (tvl >= 1e3) return `$${(tvl / 1e3).toFixed(2)}K`
    return `$${tvl.toFixed(2)}`
  }

  const formatAPY = (apy: number) => {
    return `${apy.toFixed(2)}%`
  }

  const getRiskIcon = (risk: string) => {
    switch (risk) {
      case 'low': return <Shield size={14} />
      case 'medium': return <AlertTriangle size={14} />
      case 'high': return <Zap size={14} />
      default: return null
    }
  }

  return (
    <div className="app">
      {/* Chat Panel */}
      <div className="chat-panel">
        <div className="chat-header">
          <h1>
            <MessageSquare size={20} />
            YieldScout
          </h1>
          <p>Solana DeFi Analytics Agent</p>
        </div>

        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              {msg.role === 'agent' ? (
                <pre>{msg.content}</pre>
              ) : (
                msg.content
              )}
            </div>
          ))}
          {chatLoading && (
            <div className="message agent">
              <RefreshCw size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about yields, pools, or risks..."
            disabled={chatLoading}
          />
          <button onClick={sendMessage} disabled={chatLoading || !inputValue.trim()}>
            <Send size={18} />
          </button>
        </div>
      </div>

      {/* Yield Panel */}
      <div className="yield-panel">
        <div className="yield-header">
          <h2>
            <TrendingUp size={20} />
            Live Yield Opportunities
          </h2>
          <span className="last-update">
            Updated: {lastUpdate ? new Date(lastUpdate).toLocaleTimeString() : '-'}
          </span>
        </div>

        <div className="filters">
          <div className="filter-group">
            <label>Protocol:</label>
            <select value={protocolFilter} onChange={(e) => setProtocolFilter(e.target.value as Protocol)}>
              <option value="all">All</option>
              <option value="Raydium">Raydium</option>
              <option value="Orca">Orca</option>
              <option value="Marinade">Marinade</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Risk:</label>
            <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value as RiskLevel)}>
              <option value="all">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Min APY:</label>
            <input
              type="number"
              value={minApy}
              onChange={(e) => setMinApy(Number(e.target.value))}
              placeholder="0"
              min={0}
              max={1000}
            />
            <span>%</span>
          </div>
        </div>

        <div className="yield-table-container">
          {loading ? (
            <div className="loading">
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
              <p>Loading yield data...</p>
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="empty">
              <Search size={24} />
              <p>No pools match your filters</p>
            </div>
          ) : (
            <table className="yield-table">
              <thead>
                <tr>
                  <th>Pool</th>
                  <th>Protocol</th>
                  <th>APY</th>
                  <th>TVL</th>
                  <th>Risk</th>
                </tr>
              </thead>
              <tbody>
                {filteredPools.map(pool => (
                  <tr key={pool.id}>
                    <td>
                      <span className="pool-name">{pool.name}</span>
                    </td>
                    <td>
                      <span className={`protocol-badge ${pool.protocol.toLowerCase()}`}>
                        {pool.protocol === 'Raydium' && <Droplets size={12} style={{ marginRight: '4px' }} />}
                        {pool.protocol === 'Orca' && <Droplets size={12} style={{ marginRight: '4px' }} />}
                        {pool.protocol === 'Marinade' && <Shield size={12} style={{ marginRight: '4px' }} />}
                        {pool.protocol}
                      </span>
                    </td>
                    <td>
                      <span className="apy-value">{formatAPY(pool.apy)}</span>
                    </td>
                    <td className="tvl-value">{formatTVL(pool.tvl)}</td>
                    <td>
                      <span className={`risk-badge ${pool.riskLevel}`}>
                        {getRiskIcon(pool.riskLevel)}
                        {pool.riskLevel}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
