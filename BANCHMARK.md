#Banchmark Tests for lightning-pool

## How we test it?

You can download [source code](https://github.com/panates/lightning-pool/benchmark-test) from [lightning-pool](https://github.com/panates/lightning-pool) repository. 

### Test parameters

 - *Total requests:* Number of request
 - *Test loops:* Specifies how many times will each scenario executed. It is used to determine an average result.
 - *Pool Resources:* Specifies how many resources will pool libraries use.
 - *Acquiring Time:* It is used to simulate a wait time for creating resources.
 - *Release After:* Specifies a timeout for releasing resources after acquire. 


|Scenario|[advanced](https://github.com/atheros/node-advanced-pool)|[generic](https://github.com/coopernurse/node-pool)|[lightning](https://github.com/panates/lightning-pool)|Result|
|------------|-----|-----|-----|-------|
|Total requests: 1,000<br>Test loops: 2<br>Pool Resources: 10|656.5 ms|307.5 ms|149.5 ms|lightning is **%106** faster than generic<br>lightning is **%339** faster than advanced|
|Total requests: 10,000<br>Test loops: 2<br>Pool Resources: 10|6212.5 ms|2840 ms|1372.25 ms|lightning is **%107** faster than generic<br>lightning is **%353** faster than advanced|
|Total requests: 10,000<br>Test loops: 2<br>Pool Resources: 100|3741.25 ms|364.75 ms|157.75 ms|lightning is **%131** faster than generic<br>lightning is **%2272** faster than advanced|
|Total requests: 10,000<br>Test loops: 2<br>Pool Resources: 1,000|3468 ms|118.25 ms|35.5 ms|lightning is **%233** faster than generic<br>lightning is **%9669** faster than advanced|
|Total requests: 100,000<br>Test loops: 2<br>Pool Resources: 1,000|43703 ms|1669 ms|505.5 ms|lightning is **%230** faster than generic<br>lightning is **%8545** faster than advanced|


```bash
### Starting Test- 1 ###
- Total requests:  1000
- Test loops:  4
- Pool Resources:  10
- Acquiring Time:  5 ms
- Release After:  1 ms
> lightning-pool : Avg  149.5 ms
> generic-pool : Avg  307.5 ms
> advanced-pool : Avg  656.5 ms
Result: lightning is % 106 faster than generic
Result: lightning is % 339 faster than advanced
 
### Starting Test- 2 ###
- Total requests:  10000
- Test loops:  4
- Pool Resources:  10
- Acquiring Time:  5 ms
- Release After:  1 ms
> lightning-pool : Avg  1372.25 ms
> generic-pool : Avg  2840 ms
> advanced-pool : Avg  6212.5 ms
Result: lightning is % 107 faster than generic
Result: lightning is % 353 faster than advanced
 
### Starting Test- 3 ###
- Total requests:  10000
- Test loops:  4
- Pool Resources:  100
- Acquiring Time:  5 ms
- Release After:  1 ms
> lightning-pool : Avg  157.75 ms
> generic-pool : Avg  364.75 ms
> advanced-pool : Avg  3741.25 ms
Result: lightning is % 131 faster than generic
Result: lightning is % 2272 faster than advanced
 
### Starting Test- 4 ###
- Total requests:  10000
- Test loops:  4
- Pool Resources:  1000
- Acquiring Time:  5 ms
- Release After:  1 ms
> lightning-pool : Avg  35.5 ms
> generic-pool : Avg  118.25 ms
> advanced-pool : Avg  3468 ms
Result: lightning is % 233 faster than generic
Result: lightning is % 9669 faster than advanced
 
### Starting Test- 5 ###
- Total requests:  100000
- Test loops:  4
- Pool Resources:  1000
- Acquiring Time:  5 ms
- Release After:  1 ms
> lightning-pool : Avg  505.5 ms
> generic-pool : Avg  1669 ms
> advanced-pool : Avg  43703 ms
Result: lightning is % 230 faster than generic
Result: lightning is % 8545 faster than advanced
 
```
