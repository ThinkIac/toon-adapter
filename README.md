# TOON Adapter

Adapta resultados de ferramentas JSON enviados ao modelo pelo agente ThinkIac. Para cada resultado que seja integralmente um objeto ou array JSON, compara JSON minificado com TOON usando o codificador oficial. Escolhe TOON apenas quando a representação completa, incluindo o marcador de formato, ocupa menos bytes e sua decodificação preserva os dados. Em empate usa JSON minificado; em erro mantém o conteúdo original.

A transformação ocorre em uma cópia transitória antes da chamada ao modelo. O histórico, arquivos, argumentos das ferramentas e respostas do agente permanecem intactos. Textos que não sejam JSON completo, mensagens do usuário, JSON embutido em texto e conteúdo multimodal não são alterados. A comparação em bytes é uma aproximação, não uma garantia de economia em tokens: a tokenização depende do modelo.

## Instalação

Instale este pacote no diretório `packages/toon-adapter` do ThinkIac e instale suas dependências com `npm install --workspaces=false`. O agente precisa disponibilizar o evento `agent:input:transform` antes da chamada ao modelo. Com o pacote carregado pelo Runtime, o hook é aplicado automaticamente; sem o pacote ou se o hook falhar, o agente mantém as mensagens originais. Reinicie ou recarregue os pacotes conforme o procedimento do Runtime.

## Desenvolvimento

Execute `npm test --workspaces=false`. A implementação usa [@toon-format/toon](https://github.com/toon-format/toon).

## Compatibilidade e configuração

Requer uma versão do ThinkIac cujo agente execute e aguarde a pipeline `agent:input:transform` antes de `modelGateway.legacy`. Ainda não há uma versão publicada do ThinkIac identificada que garanta esse contrato; confira o código da instalação. A ativação depende do registro do hook pelo Runtime e das regras de governança de eventos.

`adaptMessages(messages, options)` aceita `maxBytes` (1.048.576), `maxDepth` (64), `maxNodes` (50.000), `minSavingsBytes` (1) e `cacheEntries` (128). O hook também aceita essas opções em `payload.toonOptions` quando o emissor as fornece. O agente atual não as fornece, portanto usa os padrões. O cache é limitado por entradas e mantido em memória do processo. `tokenizer`, quando fornecido à API direta, deve retornar a contagem numérica de tokens de uma string; os resultados são estimativas para esse tokenizer, não uma garantia para outros modelos. As métricas retornam conversões, bytes economizados em relação ao JSON minificado, contagens de tokens medidas, economia estimada, acertos de cache e duração em milissegundos. O hook registra essas métricas quando há conversão, sem registrar os dados.

Falhas de parse, serialização, codificação ou decodificação e entradas acima dos limites mantêm o conteúdo original. JSON válido que não obtenha economia em TOON pode ser minificado. Apenas objetos e arrays JSON completos em conteúdo textual de mensagens `tool` são elegíveis. As demais mensagens e metadados não são modificados. O agente valida novamente a equivalência antes de aceitar o resultado; se o pacote estiver ausente ou a validação falhar, usa o original.

Exemplo de entrada: `[{"id":1,"ativo":true},{"id":2,"ativo":true}]`. A codificação TOON correspondente é `"[2]{id,ativo}:\n  1,true\n  2,true"`. O adaptador inclui um marcador de formato e só envia TOON quando a representação completa supera a economia mínima em bytes. Menos bytes não garantem menos tokens.
