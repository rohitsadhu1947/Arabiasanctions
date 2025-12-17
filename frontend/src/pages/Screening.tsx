import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { 
  Search, 
  User, 
  Building, 
 
  Download,
  ChevronDown,

  CheckCircle,
  Clock,


  Sliders,
  XCircle,
  Shield,
} from 'lucide-react';
import { cn, getRiskColor, formatPercentage } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { screeningApi } from '../lib/api';

type EntityType = 'individual' | 'corporate';

interface ScreeningResult {
  reference_id: string;
  screened_name: string;
  entity_type: string;
  total_matches: number;
  highest_score: number;
  risk_level: string;
  matches: Array<{
    sanction_entry_id: number;
    list_code: string;
    list_name: string;
    matched_name: string;
    primary_name: string;
    is_alias_match: boolean;
    aliases: string[];
    entity_type: string;
    match_score: number;
    dob_match: boolean;
    nationality_match: boolean;
    sanction_date: string;
    sanction_programs: string[];
    sanction_reason: string;
  }>;
  processing_time_ms: number;
  timestamp: string;
}

const sanctionLists = [
  { code: 'OFAC_SDN', name: 'OFAC SDN', checked: true },
  { code: 'UN_CONSOLIDATED', name: 'UN Consolidated', checked: true },
  { code: 'EU_CONSOLIDATED', name: 'EU Consolidated', checked: true },
  { code: 'UK_SANCTIONS', name: 'UK Sanctions', checked: false },
];

export function Screening() {
  const [entityType, setEntityType] = useState<EntityType>('individual');
  const [isScreening, setIsScreening] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [threshold, setThreshold] = useState(0.75);
  const [result, setResult] = useState<ScreeningResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [nationality, setNationality] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [passportNumber, setPassportNumber] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [registrationCountry, setRegistrationCountry] = useState('');

  const handleScreen = async () => {
    setIsScreening(true);
    setError(null);
    setResult(null);

    try {
      const requestData = {
        entity_type: entityType,
        country_code: 'UAE',
        match_threshold: threshold,
        ...(entityType === 'individual' ? {
          individual: {
            full_name: fullName,
            date_of_birth: dateOfBirth || undefined,
            nationality: nationality || undefined,
            national_id: nationalId || undefined,
            passport_number: passportNumber || undefined,
          }
        } : {
          corporate: {
            company_name: companyName,
            registration_number: registrationNumber || undefined,
            registration_country: registrationCountry || undefined,
          }
        })
      };

      const response = await screeningApi.screenSingle(requestData);
      
      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.message || 'Screening failed');
      }
    } catch (err: any) {
      console.error('Screening error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to perform screening');
    } finally {
      setIsScreening(false);
    }
  };

  const clearForm = () => {
    setFullName('');
    setDateOfBirth('');
    setNationality('');
    setNationalId('');
    setPassportNumber('');
    setCompanyName('');
    setRegistrationNumber('');
    setRegistrationCountry('');
    setResult(null);
    setError(null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-100">Screening</h1>
          <p className="text-surface-400 mt-1">Perform single or bulk sanctions screening</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">
            <Download className="w-4 h-4" />
            Bulk Upload
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Screening Form */}
        <Card variant="glass" className="col-span-2">
          <CardHeader>
            <CardTitle>New Screening Request</CardTitle>
            <CardDescription>Enter entity details to perform sanctions screening</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Entity Type Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => { setEntityType('individual'); setResult(null); }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
                  entityType === 'individual'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'
                )}
              >
                <User className="w-4 h-4" />
                Individual
              </button>
              <button
                onClick={() => { setEntityType('corporate'); setResult(null); }}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all',
                  entityType === 'corporate'
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'bg-surface-800 text-surface-400 hover:text-surface-200 hover:bg-surface-700'
                )}
              >
                <Building className="w-4 h-4" />
                Corporate
              </button>
            </div>

            <AnimatePresence mode="wait">
              {entityType === 'individual' ? (
                <motion.div
                  key="individual"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="col-span-2">
                    <Input 
                      label="Full Name *" 
                      placeholder="Enter full name" 
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>
                  <Input 
                    label="Date of Birth" 
                    type="date" 
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                  <Input 
                    label="Nationality" 
                    placeholder="e.g., Syria, Iran" 
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                  />
                  <Input 
                    label="National ID" 
                    placeholder="Enter national ID" 
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                  />
                  <Input 
                    label="Passport Number" 
                    placeholder="Enter passport number" 
                    value={passportNumber}
                    onChange={(e) => setPassportNumber(e.target.value)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="corporate"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <div className="col-span-2">
                    <Input 
                      label="Company Name *" 
                      placeholder="Enter company name" 
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                  <Input 
                    label="Registration Number" 
                    placeholder="Enter registration number" 
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                  <Input 
                    label="Registration Country" 
                    placeholder="e.g., United Arab Emirates" 
                    value={registrationCountry}
                    onChange={(e) => setRegistrationCountry(e.target.value)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Advanced Options */}
            <div className="border-t border-surface-700 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                <Sliders className="w-4 h-4" />
                Advanced Options
                <ChevronDown className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')} />
              </button>
              
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      {/* Match Threshold */}
                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">
                          Match Threshold: {(threshold * 100).toFixed(0)}%
                        </label>
                        <input
                          type="range"
                          min="0.5"
                          max="1"
                          step="0.05"
                          value={threshold}
                          onChange={(e) => setThreshold(parseFloat(e.target.value))}
                          className="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                        />
                        <div className="flex justify-between text-xs text-surface-500 mt-1">
                          <span>50%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      {/* Sanction Lists */}
                      <div>
                        <label className="block text-sm font-medium text-surface-300 mb-2">
                          Sanction Lists
                        </label>
                        <div className="space-y-2">
                          {sanctionLists.map((list) => (
                            <label key={list.code} className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                defaultChecked={list.checked}
                                className="w-4 h-4 rounded border-surface-600 bg-surface-800 text-primary-500 focus:ring-primary-500 focus:ring-offset-surface-900"
                              />
                              <span className="text-sm text-surface-300">{list.name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400">
                <div className="flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-surface-700">
              <div className="flex items-center gap-2 text-sm text-surface-500">
                <Clock className="w-4 h-4" />
                Average processing time: ~45ms
              </div>
              <div className="flex gap-3">
                <Button variant="secondary" onClick={clearForm}>Clear Form</Button>
                <Button 
                  onClick={handleScreen} 
                  loading={isScreening}
                  disabled={entityType === 'individual' ? !fullName : !companyName}
                >
                  <Search className="w-4 h-4" />
                  Screen Now
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results or Quick Stats */}
        <div className="space-y-4">
          {result ? (
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Screening Result
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Result Summary */}
                <div className="p-4 rounded-lg bg-surface-800/50">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-surface-400">Reference</span>
                    <span className="font-mono text-sm text-primary-400">{result.reference_id}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-surface-400">Entity</span>
                    <span className="text-sm text-surface-200">{result.screened_name}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-surface-400">Matches Found</span>
                    <span className={cn(
                      'text-lg font-bold',
                      result.total_matches > 0 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {result.total_matches}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-surface-400">Highest Score</span>
                    <span className={cn(
                      'text-lg font-bold',
                      result.highest_score >= 0.9 ? 'text-red-400' :
                      result.highest_score >= 0.75 ? 'text-yellow-400' : 'text-green-400'
                    )}>
                      {result.highest_score > 0 ? formatPercentage(result.highest_score) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-surface-400">Risk Level</span>
                    <span className={cn(
                      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
                      getRiskColor(result.risk_level)
                    )}>
                      {result.risk_level}
                    </span>
                  </div>
                </div>

                {/* Match Details */}
                {result.matches.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-surface-300">Match Details</h4>
                    {result.matches.map((match, index) => (
                      <div key={index} className="p-3 rounded-lg bg-surface-800/30 border border-surface-700/50">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-surface-200">{match.matched_name}</p>
                            <p className="text-xs text-surface-500">{match.list_name}</p>
                          </div>
                          <Badge variant={match.match_score >= 0.9 ? 'danger' : 'warning'}>
                            {formatPercentage(match.match_score)}
                          </Badge>
                        </div>
                        {match.aliases.length > 0 && (
                          <p className="text-xs text-surface-500 mb-2">
                            Aliases: {match.aliases.slice(0, 3).join(', ')}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1">
                          {match.sanction_programs.map((prog, i) => (
                            <span key={i} className="px-1.5 py-0.5 text-xs bg-red-500/10 text-red-400 rounded">
                              {prog}
                            </span>
                          ))}
                        </div>
                        {match.nationality_match && (
                          <p className="text-xs text-yellow-400 mt-2">⚠️ Nationality match</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {result.total_matches === 0 && (
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                    <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                    <p className="text-green-400 font-medium">No matches found</p>
                    <p className="text-xs text-surface-500 mt-1">Entity cleared for processing</p>
                  </div>
                )}

                <div className="text-xs text-surface-500 text-center pt-2">
                  Processed in {result.processing_time_ms}ms
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card variant="glass">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                      <Search className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-surface-100">247</p>
                      <p className="text-sm text-surface-400">Screenings Today</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card variant="glass">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-surface-100">12</p>
                      <p className="text-sm text-surface-400">Pending Review</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card variant="glass">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-surface-100">98.2%</p>
                      <p className="text-sm text-surface-400">Auto-Release Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card variant="glass" className="border-dashed border-2 border-surface-700">
                <CardContent className="py-8 text-center">
                  <Search className="w-8 h-8 text-surface-600 mx-auto mb-2" />
                  <p className="text-surface-500">Enter details and click<br />"Screen Now" to see results</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
