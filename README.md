# TOON Adapter

Adapta resultados de ferramentas JSON enviados ao modelo pelo agente ThinkIac. Para cada resultado que seja integralmente um objeto ou array JSON, compara JSON minificado com TOON usando o codificador oficial. Escolhe TOON apenas quando a representação completa, incluindo o marcador de formato, ocupa menos bytes e sua decodificação preserva os dados. Em empate ou erro usa JSON minificado.

A transformação ocorre em uma cópia transitória antes da chamada ao modelo. O histórico, arquivos, argumentos das ferramentas e respostas do agente permanecem intactos. Textos que não sejam JSON completo, mensagens do usuário, JSON embutido em texto e conteúdo multimodal não são alterados. A comparação em bytes é uma aproximação, não uma garantia de economia em tokens: a tokenização depende do modelo.

## Instalação

Instale este pacote no diretório `packages/toon-adapter` do ThinkIac e instale suas dependências com `npm install --workspaces=false`. O agente precisa disponibilizar o evento `agent:input:transform` antes da chamada ao modelo. Com o pacote carregado pelo Runtime, o hook é aplicado automaticamente; sem o pacote ou se o hook falhar, o agente mantém as mensagens originais. Reinicie ou recarregue os pacotes conforme o procedimento do Runtime.

## Desenvolvimento

Execute `npm test --workspaces=false`. A implementação usa [@toon-format/toon](https://github.com/toon-format/toon).
